const crypto = require('crypto');

export default function generateAirtableChallengeParams() {
	// Generate code_verifier
	const codeVerifier = generateRandomString(128);

	// Generate code_challenge
	const codeChallenge = generateCodeChallenge(codeVerifier);

	// Generate state
	const state = generateRandomString(32);

	return {
		code_verifier: codeVerifier,
		code_challenge: codeChallenge,
		state: state,
	};
}

function generateRandomString(length) {
	const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._';
	let result = '';
	const randomValues = new Uint8Array(length);
	crypto.randomFillSync(randomValues);
	for (let i = 0; i < length; i++) {
		result += charset[randomValues[i] % charset.length];
	}
	return result;
}

function generateCodeChallenge(codeVerifier) {
	const hash = crypto.createHash('sha256').update(codeVerifier).digest();
	return base64UrlEncode(hash);
}

function base64UrlEncode(buffer) {
	return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
