import { getHTMLTemplate } from './getHTMLTemplate';
import { getGooglePickerHTML } from './getGooglePickerHTML';
import { generateRandomId, generateAirtableChallengeParams } from './generateAirtableChallenge';

enum Platform {
	Notion = 'notion',
	Airtable = 'airtable',
	GoogleSheets = 'google-sheets',
}

enum Command {
	Authorize = 'authorize',
	Poll = 'poll',
	Refresh = 'refresh',
	Redirect = 'redirect',
	API = 'api',
	OpenGooglePicker = 'open-picker',
	PollGooglePicker = 'poll-picker',
	GooglePickerCallback = 'picker-callback',
}

async function handleRequest(request: Request, env: Env) {
	const requestUrl = new URL(request.url);
	const sections = requestUrl.pathname.replace(/^\/+|\/+$/g, '').split('/');

	const platform = sections[0] as Platform;
	const command = (platform ? sections[1] : sections[0]) as Command;

	const accessControlOrigin = { 'Access-Control-Allow-Origin': env.PLUGIN_URI };
	const redirectURI = `${env.REDIRECT_URI}/${platform}/${Command.Redirect}/`;

	// Generate an authorization URL to login into the provider, and a set of
	// read and write keys for retrieving the access token later on.

	// Authorize //
	if (request.method === 'POST' && command === Command.Authorize) {
		const readKey = generateRandomId(16);
		let writeKey;
		let keyValueStoreData;
		let authorizeUrl;

		switch (platform) {
			case Platform.Notion:
				writeKey = generateRandomId(16);

				const notionAuthorizeParams = new URLSearchParams();
				notionAuthorizeParams.append('client_id', env.NOTION_CLIENT_ID);
				notionAuthorizeParams.append('redirect_uri', redirectURI);
				notionAuthorizeParams.append('response_type', 'code');
				notionAuthorizeParams.append('state', writeKey);
				notionAuthorizeParams.append('owner', 'user');

				const notionAuthorizeUrl = new URL('https://api.notion.com/v1/oauth/authorize');
				notionAuthorizeUrl.search = notionAuthorizeParams.toString();
				authorizeUrl = notionAuthorizeUrl.toString();

				keyValueStoreData = JSON.stringify({ readKey });
				break;
			case Platform.Airtable:
				const challengeParams = await generateAirtableChallengeParams();
				writeKey = challengeParams.state;

				const airtableAuthorizeParams = new URLSearchParams();
				airtableAuthorizeParams.append('client_id', env.AIRTABLE_CLIENT_ID);
				airtableAuthorizeParams.append('redirect_uri', redirectURI);
				airtableAuthorizeParams.append('response_type', 'code');
				airtableAuthorizeParams.append('scope', 'data.records:read schema.bases:read');

				airtableAuthorizeParams.append('state', challengeParams.state);
				airtableAuthorizeParams.append('code_challenge', challengeParams.code_challenge);
				airtableAuthorizeParams.append('code_challenge_method', 'S256');

				// Generate the login URL for the provider.
				const airtableAuthorizeUrl = new URL('https://airtable.com/oauth2/v1/authorize/');
				airtableAuthorizeUrl.search = airtableAuthorizeParams.toString();
				authorizeUrl = airtableAuthorizeUrl.toString();

				keyValueStoreData = JSON.stringify({ readKey, challengeVerifier: challengeParams.code_verifier });
				break;
			case Platform.GoogleSheets:
				writeKey = generateRandomId(16);

				const googleAuthorizeParams = new URLSearchParams();
				googleAuthorizeParams.append('client_id', env.GOOGLE_CLIENT_ID);
				googleAuthorizeParams.append('redirect_uri', redirectURI);
				googleAuthorizeParams.append('response_type', 'code');
				googleAuthorizeParams.append(
					'scope',
					'https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.file'
				);
				googleAuthorizeParams.append('access_type', 'offline');
				googleAuthorizeParams.append('include_granted_scopes', 'true');
				googleAuthorizeParams.append('state', writeKey);

				// Generate the login URL for the provider.
				const googleAuthorizeUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
				googleAuthorizeUrl.search = googleAuthorizeParams.toString();
				authorizeUrl = googleAuthorizeUrl.toString();

				keyValueStoreData = JSON.stringify({ readKey });
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
				...accessControlOrigin,
			},
		});
	}

	// Once the user has been authorized via login page, the provider will
	// redirect them back this URL with an access code (not an access token) and
	// the write key we stored in the state param.

	// Redirect //
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
				break;
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
			case Platform.Notion:
				const notionTokenParams = {
					code: authorizationCode,
					grant_type: "authorization_code",
					redirect_uri: redirectURI
				};

				tokenResponse = await fetch("https://api.notion.com/v1/oauth/token", {
					method: "POST",
					headers: {
						'Authorization': `Basic ${btoa(`${env.NOTION_CLIENT_ID}:${env.NOTION_SECRET}`)}`,
						'Content-Type': 'application/json',
						'Notion-Version': '2022-06-28'
					},
					body: JSON.stringify(notionTokenParams),
				})
				break;
			case Platform.Airtable:
				const { challengeVerifier } = JSON.parse(storedValue);

				// Generate a new URL with the access code and client secret.
				const airtableTokenParams = new URLSearchParams();
				airtableTokenParams.append('redirect_uri', redirectURI);
				airtableTokenParams.append('code', authorizationCode);
				airtableTokenParams.append('client_id', env.AIRTABLE_CLIENT_ID);
				airtableTokenParams.append('client_secret', env.AIRTABLE_CLIENT_SECRET);
				airtableTokenParams.append('grant_type', 'authorization_code');
				airtableTokenParams.append('code_verifier', challengeVerifier);

				// This additional POST request retrieves the access token and expiry
				// information used for further API requests to the provider.
				tokenResponse = await fetch('https://airtable.com/oauth2/v1/token', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						Authorization: getAirtableAuthorizationHeader(env),
					},
					body: airtableTokenParams.toString(),
				});
				break;
			case Platform.GoogleSheets:
				// Generate a new URL with the access code and client secret.
				const googleTokenParams = new URLSearchParams();
				googleTokenParams.append('client_id', env.GOOGLE_CLIENT_ID);
				googleTokenParams.append('client_secret', env.GOOGLE_CLIENT_SECRET);
				googleTokenParams.append('code', authorizationCode);
				googleTokenParams.append('grant_type', 'authorization_code');
				googleTokenParams.append('redirect_uri', redirectURI);

				// This additional POST request retrieves the access token and expiry
				// information used for further API requests to the provider.
				tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					body: googleTokenParams.toString(),
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
		const keyValueStoreData = JSON.stringify(await tokenResponse.json());
		await env.keyValueStore.put(`tokens:${readKey}`, keyValueStoreData, {
			expirationTtl: 300,
		});

		return new Response(getHTMLTemplate('Authentication successful! You can close this window and return to Framer.'), {
			headers: {
				'Content-Type': 'text/html',
			},
		});
	}

	// Poll //
	if (request.method === 'POST' && command === Command.Poll) {
		const readKey = requestUrl.searchParams.get('readKey');

		if (!readKey) {
			return new Response('Missing read key URL param', {
				status: 400,
				headers: {
					...accessControlOrigin,
				},
			});
		}

		const tokens = await env.keyValueStore.get(`tokens:${readKey}`);

		if (!tokens) {
			return new Response(null, {
				status: 404,
				headers: { ...accessControlOrigin },
			});
		}

		// Even though the tokens have an expiry, it's important to delete them on
		// our side to reduce the reliability of storing user's sensitive data.
		await env.keyValueStore.delete(`tokens:${readKey}`);

		return new Response(tokens, {
			headers: {
				'Content-Type': 'application/json',
				...accessControlOrigin,
			},
		});
	}

	// Refresh //
	if (request.method === 'POST' && command === Command.Refresh) {
		const refreshToken = requestUrl.searchParams.get('refresh_token');

		if (!refreshToken) {
			return new Response('Missing refresh token URL param', {
				status: 400,
				headers: {
					...accessControlOrigin,
				},
			});
		}

		let refreshResponse;

		switch (platform) {
			case Platform.Airtable:
				refreshResponse = await fetch('https://airtable.com/oauth2/v1/token', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						Authorization: getAirtableAuthorizationHeader(env),
					},
					body: objectToURLParams({
						refresh_token: refreshToken,
						grant_type: 'refresh_token',
					}),
				});
				break;
			case Platform.GoogleSheets:
				refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					body: objectToURLParams({
						client_id: env.GOOGLE_CLIENT_ID,
						client_secret: env.GOOGLE_CLIENT_SECRET,
						grant_type: 'refresh_token',
						refresh_token: refreshToken,
					}),
				});
				break;
			default:
				throw new Error('Unsupported platform');
		}

		if (refreshResponse.status !== 200) {
			return new Response(refreshResponse.statusText, {
				status: refreshResponse.status,
				headers: {
					...accessControlOrigin,
				},
			});
		}

		const tokens = await refreshResponse.json();

		return new Response(JSON.stringify(tokens), {
			headers: {
				...accessControlOrigin,
			},
		});
	}

	if ((request.method === 'GET' || request.method === 'POST') && command === Command.API && platform === Platform.Notion) {
		// Forward the request to the Notion API
		const url = requestUrl.searchParams.get('url');
		const accessToken = requestUrl.searchParams.get('access_token');

		if (!url) {
			return new Response('Missing URL URL param', {
				status: 400,
			});
		}

		const notionResponse = await fetch(url, {
			method: request.method,
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Notion-Version': '2022-06-28',
				'Content-Type': 'application/json',
			},
			body: request.body,
		});

		return new Response(notionResponse.body, {
			headers: {
				'Content-Type': 'application/json',
				...accessControlOrigin,
			},
		});
	}

	// Open Google Picker //
	if (request.method === 'GET' && command === Command.OpenGooglePicker && platform === Platform.GoogleSheets) {
		const accessToken = requestUrl.searchParams.get('access_token');

		if (!accessToken) {
			return new Response('Missing access token URL param', {
				status: 400,
			});
		}

		return new Response(
			getGooglePickerHTML({
				accessToken,
				developerAPIKey: env.GOOGLE_DEVELOPER_API_KEY,
				pickerCallbackURL: `${env.REDIRECT_URI}/${Platform.GoogleSheets}/${Command.GooglePickerCallback}`,
			}),
			{
				headers: {
					'Content-Type': 'text/html',
				},
			}
		);
	}

	// Poll Google Picker //
	if (request.method === 'POST' && command === Command.PollGooglePicker && platform === Platform.GoogleSheets) {
		return new Response('Polling Google Picker');
	}

	if (request.method === 'POST' && command === Command.GooglePickerCallback && platform === Platform.GoogleSheets) {
		return new Response('Google Picker Callback');
	}

	if (request.method === 'GET' && requestUrl.pathname === '/') {
		return new Response('✅ OAuth Worker is up and running!');
	}

	// Handle pre-flight requests
	if (request.method === 'OPTIONS') {
		return new Response(null, {
			headers: {
				...accessControlOrigin,
				'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Notion-Version, Authorization',
			},
		});
	}

	return new Response('Page not found', {
		status: 404,
		headers: {
			...accessControlOrigin,
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

function getAirtableAuthorizationHeader(env) {
	return `Basic ${Buffer.from(`${env.AIRTABLE_CLIENT_ID}:${env.AIRTABLE_CLIENT_SECRET}`).toString('base64')}`;
}

function objectToURLParams(object: Record<string, string>) {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(object)) {
		params.append(key, value);
	}
	return params.toString();
}
