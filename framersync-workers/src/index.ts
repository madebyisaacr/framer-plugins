import { getHTMLTemplate } from './getHTMLTemplate';
import { generateRandomId, generateAirtableChallengeParams } from './generateAirtableChallenge';

async function handleRequest(request: Request, env: Env) {
	const requestUrl = new URL(request.url);

	// Generate an authorization URL to login into the provider, and a set of
	// read and write keys for retrieving the access token later on.
	if (request.method === 'POST' && requestUrl.pathname.startsWith('/authorize/')) {
		const readKey = generateRandomId(16);
		const challengeParams = await generateAirtableChallengeParams();
		const writeKey = challengeParams.state;

		const authorizeParams = new URLSearchParams();
		authorizeParams.append('client_id', env.CLIENT_ID);
		authorizeParams.append('redirect_uri', env.REDIRECT_URI);
		authorizeParams.append('response_type', 'code');
		authorizeParams.append('scope', 'data.records:read schema.bases:read');

		authorizeParams.append('state', challengeParams.state);
		authorizeParams.append('code_challenge', challengeParams.code_challenge);
		authorizeParams.append('code_challenge_method', 'S256');

		// Generate the login URL for the provider.
		const authorizeUrl = new URL('https://airtable.com/oauth2/v1/authorize/');
		authorizeUrl.search = authorizeParams.toString();

		await env.keyValueStore.put(`readKey:${writeKey}`, JSON.stringify({ readKey, challengeVerifier: challengeParams.code_verifier }), {
			expirationTtl: 60,
		});

		const response = JSON.stringify({
			url: authorizeUrl.toString(),
			readKey,
		});

		return new Response(response, {
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': env.PLUGIN_URI,
			},
		});
	}

	// Once the user has been authorized via login page, the provider will
	// redirect them back this URL with an access code (not an access token) and
	// the write key we stored in the state param.
	if (request.method === 'GET' && requestUrl.pathname.startsWith('/redirect/')) {
		const authorizationCode = requestUrl.searchParams.get('code');
		const writeKey = requestUrl.searchParams.get('state');
		const codeChallenge = requestUrl.searchParams.get('code_challenge');
		const codeChallengeMethod = requestUrl.searchParams.get('code_challenge_method');

		if (codeChallengeMethod !== 'S256') {
			return new Response('Invalid code challenge method', {
				status: 400,
			});
		}

		if (!authorizationCode) {
			return new Response('Missing authorization code URL param', {
				status: 400,
			});
		}

		if (!codeChallenge) {
			return new Response('Missing code challenge URL param', {
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

		const { readKey, challengeVerifier } = JSON.parse(storedValue);

		// Generate a new URL with the access code and client secret.
		const tokenParams = new URLSearchParams();
		tokenParams.append('client_id', env.CLIENT_ID);
		tokenParams.append('client_secret', env.CLIENT_SECRET);
		tokenParams.append('redirect_uri', env.REDIRECT_URI);
		tokenParams.append('code', authorizationCode);
		tokenParams.append('grant_type', 'authorization_code');
		tokenParams.append('code_verifier', challengeVerifier);

		// This additional POST request retrieves the access token and expiry
		// information used for further API requests to the provider.
		const tokenResponse = await fetch('https://airtable.com/oauth2/v1/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: getAuthorizationHeader(env),
			},
			body: tokenParams.toString(),
		});

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

	if (request.method === 'POST' && requestUrl.pathname.startsWith('/poll/')) {
		const readKey = requestUrl.searchParams.get('readKey');

		if (!readKey) {
			return new Response('Missing read key URL param', {
				status: 400,
				headers: {
					'Access-Control-Allow-Origin': env.PLUGIN_URI,
				},
			});
		}

		const tokens = await env.keyValueStore.get(`tokens:${readKey}`);

		if (!tokens) {
			return new Response(null, {
				status: 404,
				headers: { 'Access-Control-Allow-Origin': env.PLUGIN_URI },
			});
		}

		// Even though the tokens have an expiry, it's important to delete them on
		// our side to reduce the reliability of storing user's sensitive data.
		await env.keyValueStore.delete(`tokens:${readKey}`);

		return new Response(tokens, {
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': env.PLUGIN_URI,
			},
		});
	}

	if (request.method === 'POST' && requestUrl.pathname.startsWith('/refresh/')) {
		const refreshToken = requestUrl.searchParams.get('refresh_token');

		if (!refreshToken) {
			return new Response('Missing refresh token URL param', {
				status: 400,
				headers: {
					'Access-Control-Allow-Origin': env.PLUGIN_URI,
				},
			});
		}

		const refreshParams = new URLSearchParams();
		refreshParams.append('refresh_token', refreshToken);
		refreshParams.append('client_id', env.CLIENT_ID);
		refreshParams.append('grant_type', 'refresh_token');

		const refreshUrl = new URL("https://airtable.com/oauth2/v1/token");
		refreshUrl.search = refreshParams.toString();

		const refreshResponse = await fetch(refreshUrl.toString(), {
			method: 'POST',
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: getAuthorizationHeader(env),
			}
		});

		if (refreshResponse.status !== 200) {
			return new Response(refreshResponse.statusText, {
				status: refreshResponse.status,
			});
		}

		const tokens = await refreshResponse.json();

		return new Response(JSON.stringify(tokens), {
			headers: {
				'Access-Control-Allow-Origin': env.PLUGIN_URI,
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
				'Access-Control-Allow-Origin': env.PLUGIN_URI,
				'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type',
			},
		});
	}

	return new Response('Page not found', {
		status: 404,
		headers: {
			'Access-Control-Allow-Origin': env.PLUGIN_URI,
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
	return `Basic ${Buffer.from(`${env.CLIENT_ID}:${env.CLIENT_SECRET}`).toString('base64')}`
}
