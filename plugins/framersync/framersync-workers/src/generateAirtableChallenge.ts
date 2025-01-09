export async function generateAirtableChallengeParams() {
	// Generate code_verifier
	const codeVerifier = generateRandomId(128);

	// Generate code_challenge
	const codeChallenge = await generateCodeChallenge(codeVerifier);

	// Generate state
	const state = generateRandomId(32);

	return {
		code_verifier: codeVerifier,
		code_challenge: codeChallenge,
		state: state,
	};
}

export function generateRandomId(length) {
	const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._';
	let result = '';
	const randomValues = new Uint8Array(length);
	crypto.getRandomValues(randomValues);
	for (let i = 0; i < length; i++) {
		result += charset[randomValues[i] % charset.length];
	}
	return result;
}

async function generateCodeChallenge(codeVerifier) {
	const encoder = new TextEncoder();
	const data = encoder.encode(codeVerifier);
	const hash = await crypto.subtle.digest('SHA-256', data);
	return base64UrlEncode(hash);
}

function base64UrlEncode(buffer) {
	const base64 = btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
	return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
