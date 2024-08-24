export async function generateAuthParams() {
  // Generate code_verifier
  const codeVerifier = generateRandomString(128);

  // Generate code_challenge
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Generate state
  const state = generateRandomString(32);

  return {
    code_verifier: codeVerifier,
    code_challenge: codeChallenge,
    state: state
  };
}

function generateRandomString(length) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues)
    .map(v => charset[v % charset.length])
    .join('');
}

async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(hash);
}
