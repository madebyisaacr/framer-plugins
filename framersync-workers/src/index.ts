import { getHTMLTemplate } from './getHTMLTemplate';
import { generateRandomId, generateAirtableChallengeParams } from './generateAirtableChallenge';

enum Platform {
	Notion = 'notion',
	Airtable = 'airtable',
	GoogleSheets = 'googleSheets',
}

enum Command {
	Authorize = 'authorize',
	Poll = 'poll',
	Refresh = 'refresh',
	Redirect = 'redirect',
}

async function handleRequest(request: Request, env: Env) {
	const requestUrl = new URL(request.url);

	const ACCESS_CONTROL_ORIGIN = { 'Access-Control-Allow-Origin': env.PLUGIN_URI };
	const sections = requestUrl.pathname.replace(/^\/+|\/+$/g, '').split('/');

	const platform = sections[0]; // notion, airtable, googleSheets
	const command = (platform as Platform) ? sections[1] : sections[0]; // authorize, poll, refresh, or redirect

	// Generate an authorization URL to login into the provider, and a set of
	// read and write keys for retrieving the access token later on.
	if (request.method === 'POST' && command === Command.Authorize) {
		const readKey = generateRandomId(16);
		let writeKey;
		let keyValueStoreData;
		let authorizeUrl;

		switch (platform) {
			case Platform.Airtable:
				const challengeParams = await generateAirtableChallengeParams();
				writeKey = challengeParams.state;

				const authorizeParams = new URLSearchParams();
				authorizeParams.append('client_id', env.AIRTABLE_CLIENT_ID);
				authorizeParams.append('redirect_uri', getRedirectURI(env));
				authorizeParams.append('response_type', 'code');
				authorizeParams.append('scope', 'data.records:read schema.bases:read');

				authorizeParams.append('state', challengeParams.state);
				authorizeParams.append('code_challenge', challengeParams.code_challenge);
				authorizeParams.append('code_challenge_method', 'S256');

				// Generate the login URL for the provider.
				const authorizeUrlObject = new URL('https://airtable.com/oauth2/v1/authorize/');
				authorizeUrlObject.search = authorizeParams.toString();
				authorizeUrl = authorizeUrlObject.toString();

				keyValueStoreData = JSON.stringify({ readKey, challengeVerifier: challengeParams.code_verifier });
				break;
			default:
				throw new Error('Unsupported platform');
		}

		await env.keyValueStore.put(`readKey:${writeKey}`, keyValueStoreData, {
			expirationTtl: 60,
		});

		const response = JSON.stringify({
			url: authorizeUrl,
			readKey,
		});

		return new Response(response, {
			headers: {
				'Content-Type': 'application/json',
				...ACCESS_CONTROL_ORIGIN,
			},
		});
	}

	// Once the user has been authorized via login page, the provider will
	// redirect them back this URL with an access code (not an access token) and
	// the write key we stored in the state param.
	if (request.method === 'GET' && command === Command.Redirect) {
		const authorizationCode = requestUrl.searchParams.get('code');
		const writeKey = requestUrl.searchParams.get('state');

		switch (platform) {
			case Platform.Airtable:
				const codeChallenge = requestUrl.searchParams.get('code_challenge');
				const codeChallengeMethod = requestUrl.searchParams.get('code_challenge_method');

				if (codeChallengeMethod !== 'S256') {
					return new Response('Invalid code challenge method', {
						status: 400,
					});
				}

				if (!codeChallenge) {
					return new Response('Missing code challenge URL param', {
						status: 400,
					});
				}
				break;
			default:
				throw new Error('Unsupported platform');
		}

		if (!authorizationCode) {
			return new Response('Missing authorization code URL param', {
				status: 400,
			});
		}

		if (!writeKey) {
			return new Response('Missing state URL param', {
				status: 400,
			});
		}

		const storedValue = await env.keyValueStore.get(`readKey:${writeKey}`);

		if (!storedValue) {
			return new Response('No read key found in storage', {
				status: 400,
			});
		}

		const valueJson = JSON.parse(storedValue);

		const { readKey } = valueJson;

		let tokenResponse;

		switch (platform) {
			case Platform.Airtable:
				const { challengeVerifier } = JSON.parse(storedValue);

				// Generate a new URL with the access code and client secret.
				const tokenParams = new URLSearchParams();
				tokenParams.append('redirect_uri', getRedirectURI(env));
				tokenParams.append('code', authorizationCode);
				tokenParams.append('client_id', env.AIRTABLE_CLIENT_ID);
				tokenParams.append('client_secret', env.AIRTABLE_CLIENT_SECRET);
				tokenParams.append('grant_type', 'authorization_code');
				tokenParams.append('code_verifier', challengeVerifier);

				// This additional POST request retrieves the access token and expiry
				// information used for further API requests to the provider.
				tokenResponse = await fetch('https://airtable.com/oauth2/v1/token', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						Authorization: getAuthorizationHeader(env),
					},
					body: tokenParams.toString(),
				});
				break;
			default:
				throw new Error('Unsupported platform');
		}

		if (tokenResponse.status !== 200) {
			return new Response(tokenResponse.statusText, {
				status: tokenResponse.status,
			});
		}

		// Store the tokens temporarily inside a key value store. This will be
		// retrieved when the plugin polls for them.
		const tokens = (await tokenResponse.json()) as unknown;
		await env.keyValueStore.put(`tokens:${readKey}`, JSON.stringify(tokens), {
			expirationTtl: 300,
		});

		return new Response(getHTMLTemplate('Authentication successful! You can close this window and return to Framer.'), {
			headers: {
				'Content-Type': 'text/html',
			},
		});
	}

	if (request.method === 'POST' && command === Command.Poll) {
		const readKey = requestUrl.searchParams.get('readKey');

		if (!readKey) {
			return new Response('Missing read key URL param', {
				status: 400,
				headers: {
					...ACCESS_CONTROL_ORIGIN,
				},
			});
		}

		const tokens = await env.keyValueStore.get(`tokens:${readKey}`);

		if (!tokens) {
			return new Response(null, {
				status: 404,
				headers: { ...ACCESS_CONTROL_ORIGIN },
			});
		}

		// Even though the tokens have an expiry, it's important to delete them on
		// our side to reduce the reliability of storing user's sensitive data.
		await env.keyValueStore.delete(`tokens:${readKey}`);

		return new Response(tokens, {
			headers: {
				'Content-Type': 'application/json',
				...ACCESS_CONTROL_ORIGIN,
			},
		});
	}

	if (request.method === 'POST' && command === Command.Refresh) {
		const refreshToken = requestUrl.searchParams.get('refresh_token');

		if (!refreshToken) {
			return new Response('Missing refresh token URL param', {
				status: 400,
				headers: {
					...ACCESS_CONTROL_ORIGIN,
				},
			});
		}

		let refreshResponse;

		switch (platform) {
			case Platform.Airtable:
				if (platform === Platform.Airtable) {
					refreshResponse = await fetch('https://airtable.com/oauth2/v1/token', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/x-www-form-urlencoded',
							Authorization: getAuthorizationHeader(env),
						},
						body: `refresh_token=${refreshToken}&grant_type=refresh_token`,
					});
				}
				break;
			default:
				throw new Error('Unsupported platform');
		}

		if (refreshResponse.status !== 200) {
			return new Response(refreshResponse.statusText, {
				status: refreshResponse.status,
				headers: {
					...ACCESS_CONTROL_ORIGIN,
				},
			});
		}

		const tokens = await refreshResponse.json();

		return new Response(JSON.stringify(tokens), {
			headers: {
				...ACCESS_CONTROL_ORIGIN,
			},
		});
	}

	if (request.method === 'GET' && requestUrl.pathname === '/') {
		return new Response('✅ OAuth Worker is up and running!');
	}

	// Handle pre-flight requests
	if (request.method === 'OPTIONS') {
		return new Response(null, {
			headers: {
				...ACCESS_CONTROL_ORIGIN,
				'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type',
			},
		});
	}

	return new Response('Page not found', {
		status: 404,
		headers: {
			...ACCESS_CONTROL_ORIGIN,
		},
	});
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		return handleRequest(request, env).catch((error) => {
			const message = error instanceof Error ? error.message : 'Unknown';

			return new Response(`😔 Internal error: ${message}`, {
				status: 500,
				headers: {
					'Access-Control-Allow-Origin': env.PLUGIN_URI,
				},
			});
		});
	},
};

function getAuthorizationHeader(env) {
	return `Basic ${Buffer.from(`${env.AIRTABLE_CLIENT_ID}:${env.AIRTABLE_CLIENT_SECRET}`).toString('base64')}`;
}

function getRedirectURI(env) {
	return env.REDIRECT_URI.replace('{platform}', Platform.Airtable);
}
