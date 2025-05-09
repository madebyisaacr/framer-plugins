import googlePickerHtml from './googlePicker.html';
import authorizationSuccessHtml from './authorizationSuccess.html';
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
	GetPluginData = 'get-plugin-data',
	SetPluginData = 'set-plugin-data',
}

const PLUGIN_DATA_STORE_KEYS = ['disabledFieldIds', 'fieldSettings', 'databaseName'];

async function handleRequest(request: Request, env: Env) {
	const requestUrl = new URL(request.url);
	const sections = requestUrl.pathname.replace(/^\/+|\/+$/g, '').split('/');

	const platform = sections[0] as Platform;
	const command = (platform ? sections[1] : sections[0]) as Command;

	const accessControlOrigin = getAccessControlAllowOrigin(request);
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
				googleAuthorizeParams.append('scope', 'https://www.googleapis.com/auth/drive.file');
				googleAuthorizeParams.append('access_type', 'offline');
				googleAuthorizeParams.append('include_granted_scopes', 'true');
				googleAuthorizeParams.append('state', writeKey);
				googleAuthorizeParams.append('prompt', 'select_account consent');

				// Generate the login URL for the provider.
				const googleAuthorizeUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
				googleAuthorizeUrl.search = googleAuthorizeParams.toString();
				authorizeUrl = googleAuthorizeUrl.toString();

				keyValueStoreData = JSON.stringify({ readKey });
				break;
			default:
				throw new Error('Unsupported platform');
		}

		await env.framerSyncAuthorization.put(`readKey:${writeKey}`, keyValueStoreData, {
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

		const storedValue = await env.framerSyncAuthorization.get(`readKey:${writeKey}`);

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
					grant_type: 'authorization_code',
					redirect_uri: redirectURI,
				};

				tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
					method: 'POST',
					headers: {
						Authorization: `Basic ${btoa(`${env.NOTION_CLIENT_ID}:${env.NOTION_SECRET}`)}`,
						'Content-Type': 'application/json',
						'Notion-Version': '2022-06-28',
					},
					body: JSON.stringify(notionTokenParams),
				});
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
		await env.framerSyncAuthorization.put(`tokens:${readKey}`, keyValueStoreData, {
			expirationTtl: 300,
		});

		const html = authorizationSuccessHtml.replace('{{text}}', 'Authentication successful! You can close this window and return to Framer.');

		return new Response(html, {
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

		const tokens = await env.framerSyncAuthorization.get(`tokens:${readKey}`);

		if (!tokens) {
			return new Response(null, {
				status: 404,
				headers: { ...accessControlOrigin },
			});
		}

		// Even though the tokens have an expiry, it's important to delete them on
		// our side to reduce the reliability of storing user's sensitive data.
		await env.framerSyncAuthorization.delete(`tokens:${readKey}`);

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

	// API Proxy //
	if ((request.method === 'GET' || request.method === 'POST') && command === Command.API) {
		const url = requestUrl.searchParams.get('url');

		if (!url) {
			return new Response('Missing "url" URL param', {
				status: 400,
				headers: {
					...accessControlOrigin,
				},
			});
		}

		const response = await fetch(url, {
			method: request.method,
			headers: request.headers,
			body: request.body,
		});

		return new Response(response.body, {
			headers: {
				'Content-Type': 'application/json',
				...accessControlOrigin,
			},
		});
	}

	// Open Google Picker //
	if (request.method === 'GET' && command === Command.OpenGooglePicker && platform === Platform.GoogleSheets) {
		const accessToken = requestUrl.searchParams.get('access_token');
		const readKey = requestUrl.searchParams.get('readKey');

		if (!accessToken || !readKey) {
			return new Response('Missing access token or read key URL param', {
				status: 400,
			});
		}

		const pickerHtml = googlePickerHtml
			.replace('{{ACCESS_TOKEN}}', accessToken)
			.replace('{{DEVELOPER_API_KEY}}', env.GOOGLE_DEVELOPER_API_KEY)
			.replace('{{CALLBACK_URL}}', `${env.REDIRECT_URI}/${Platform.GoogleSheets}/${Command.GooglePickerCallback}`)
			.replace('{{CLIENT_ID}}', env.GOOGLE_CLIENT_ID)
			.replace('{{READ_KEY}}', readKey)
			.replace('{{APP_ID}}', env.GOOGLE_APP_ID);

		return new Response(pickerHtml, {
			headers: {
				'Content-Type': 'text/html',
			},
		});
	}

	// Poll Google Picker //
	if (request.method === 'POST' && command === Command.PollGooglePicker && platform === Platform.GoogleSheets) {
		const readKey = requestUrl.searchParams.get('readKey');

		if (!readKey) {
			return new Response('Missing read key URL param', {
				status: 400,
				headers: {
					...accessControlOrigin,
				},
			});
		}

		try {
			const spreadsheetId = await env.framerSyncAuthorization.get(`pickerReadKey:${readKey}`);

			if (!spreadsheetId) {
				return new Response(null, {
					status: 404,
					headers: { ...accessControlOrigin },
				});
			}

			// Delete the stored spreadsheetId after retrieving it
			await env.framerSyncAuthorization.delete(`pickerReadKey:${readKey}`);

			return new Response(JSON.stringify({ spreadsheetId }), {
				headers: {
					'Content-Type': 'application/json',
					...accessControlOrigin,
				},
			});
		} catch (error) {
			console.error('Error in poll-picker:', error);
			return new Response('Internal server error', {
				status: 500,
				headers: {
					...accessControlOrigin,
				},
			});
		}
	}

	// Google Picker Callback //
	if (request.method === 'POST' && command === Command.GooglePickerCallback && platform === Platform.GoogleSheets) {
		const readKey = requestUrl.searchParams.get('readKey');
		const spreadsheetId = requestUrl.searchParams.get('spreadsheetId');

		if (!spreadsheetId || !readKey) {
			return new Response('Missing spreadsheetId or readKey URL param', {
				status: 400,
			});
		}

		await env.framerSyncAuthorization.put(`pickerReadKey:${readKey}`, spreadsheetId, {
			expirationTtl: 300, // 5 minutes
		});

		return new Response(JSON.stringify({ success: true }), {
			headers: {
				'Content-Type': 'application/json',
				...accessControlOrigin,
			},
		});
	}

	// Add this new endpoint handler before checking for platform-specific commands
	if (request.method === 'GET' && sections[0] === Command.GetPluginData) {
		const key = requestUrl.searchParams.get('key');

		if (!key) {
			return new Response('Missing key URL param', {
				status: 400,
				headers: {
					...accessControlOrigin,
				},
			});
		}

		const value = await env.framerSyncPluginData.get(key);

		if (!value) {
			return new Response(null, {
				status: 404,
				headers: { ...accessControlOrigin },
			});
		}

		return new Response(value, {
			headers: {
				'Content-Type': 'application/json',
				...accessControlOrigin,
			},
		});
	}

	// Add this new endpoint handler next to the get-plugin-data handler
	if (request.method === 'POST' && sections[0] === Command.SetPluginData) {
		let body;
		try {
			body = await request.json();
		} catch (e) {
			return new Response('Invalid JSON body', {
				status: 400,
				headers: {
					...accessControlOrigin,
				},
			});
		}

		// Validate key exists and is string
		if (!body.key || typeof body.key !== 'string') {
			return new Response('Missing or invalid key in body', {
				status: 400,
				headers: {
					...accessControlOrigin,
				},
			});
		}

		// Validate data exists and is object
		if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
			return new Response('Missing or invalid data object in body', {
				status: 400,
				headers: {
					...accessControlOrigin,
				},
			});
		}

		// Validate all data keys are allowed and all values are strings
		for (const [key, value] of Object.entries(body.data)) {
			if (!PLUGIN_DATA_STORE_KEYS.includes(key)) {
				return new Response(`Invalid data key: ${key}`, {
					status: 400,
					headers: {
						...accessControlOrigin,
					},
				});
			}
			if (typeof value !== 'string') {
				return new Response(`Value for key ${key} must be a string`, {
					status: 400,
					headers: {
						...accessControlOrigin,
					},
				});
			}
		}

		// Store the validated data
		await env.framerSyncPluginData.put(body.key, JSON.stringify(body.data));

		return new Response(JSON.stringify({ success: true }), {
			headers: {
				'Content-Type': 'application/json',
				...accessControlOrigin,
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
				...accessControlOrigin,
				'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Notion-Version, Authorization',
			},
		});
	}

	return new Response('Page not found', {
		status: 404,
		headers: accessControlOrigin,
	});
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		return handleRequest(request, env).catch((error) => {
			const message = error instanceof Error ? error.message : 'Unknown';

			const accessControlOrigin = getAccessControlAllowOrigin(request);

			return new Response(`😔 Internal error: ${message}`, {
				status: 500,
				headers: accessControlOrigin,
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

function getAccessControlAllowOrigin(request: Request) {
	const origin = request.headers.get('Origin');
	if (
		origin &&
		(origin === 'https://plugin.framersync.com' ||
			origin === 'https://framer-plugins.pages.dev' ||
			origin === 'https://localhost:5173' ||
			origin.endsWith('.framercdn.com'))
	) {
		return { 'Access-Control-Allow-Origin': origin };
	}
	return {};
}
