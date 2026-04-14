// ─────────────────────────────────────────────────────────────────────────────
// Google Auth — OAuth via expo-auth-session
// Source of truth: resrc/system_prompt.md §3 (Secure Store rule)
// Tokens stored in expo-secure-store — NEVER in SQLite
// ─────────────────────────────────────────────────────────────────────────────

import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

// Required for expo-auth-session to work correctly on Android/iOS
WebBrowser.maybeCompleteAuthSession();

// ── SecureStore keys ─────────────────────────────────────────────────────────
const KEY_ACCESS_TOKEN = 'google_access_token';
const KEY_REFRESH_TOKEN = 'google_refresh_token';
const KEY_TOKEN_EXPIRY = 'google_token_expiry'; // Unix timestamp (ms) as string

// ── Google OAuth config ──────────────────────────────────────────────────────
// Replace with your actual Google OAuth 2.0 client IDs from Google Cloud Console.
// These are read-only at runtime — never hardcode a client secret here.
const GOOGLE_CLIENT_ID_ANDROID = 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_IOS = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_WEB = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';

// Drive scope required for read/write access to app-specific Drive folder
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// ── login ─────────────────────────────────────────────────────────────────────

/**
 * Opens the Google OAuth consent screen.
 * On success, stores access + refresh tokens in SecureStore.
 * On failure, throws an error.
 */
export async function login(): Promise<void> {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'fitpersona' });

  const request = new AuthSession.AuthRequest({
    clientId: GOOGLE_CLIENT_ID_WEB,
    scopes: SCOPES,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
  });

  const result = await request.promptAsync(discovery);

  if (result.type !== 'success') {
    throw new Error(`[Auth] OAuth flow failed: ${result.type}`);
  }

  // Exchange the authorization code for tokens
  const tokenResponse = await AuthSession.exchangeCodeAsync(
    {
      clientId: GOOGLE_CLIENT_ID_WEB,
      code: result.params.code,
      redirectUri,
      extraParams: {
        code_verifier: request.codeVerifier ?? '',
      },
    },
    discovery
  );

  await _storeTokens(tokenResponse);
}

// ── getAccessToken ────────────────────────────────────────────────────────────

/**
 * Returns a valid access token.
 * Automatically refreshes if the stored token is expired.
 * Returns null if the user is not authenticated.
 */
export async function getAccessToken(): Promise<string | null> {
  const accessToken = await SecureStore.getItemAsync(KEY_ACCESS_TOKEN);
  const expiryStr = await SecureStore.getItemAsync(KEY_TOKEN_EXPIRY);

  if (!accessToken) return null;

  const expiry = expiryStr ? parseInt(expiryStr, 10) : 0;
  const isExpired = Date.now() >= expiry - 60_000; // 60s buffer

  if (!isExpired) return accessToken;

  // Token expired — attempt refresh
  const refreshToken = await SecureStore.getItemAsync(KEY_REFRESH_TOKEN);
  if (!refreshToken) {
    await logout();
    return null;
  }

  try {
    const refreshed = await AuthSession.refreshAsync(
      { clientId: GOOGLE_CLIENT_ID_WEB, refreshToken },
      discovery
    );
    await _storeTokens(refreshed);
    return (await SecureStore.getItemAsync(KEY_ACCESS_TOKEN)) ?? null;
  } catch {
    // Refresh failed — user must re-authenticate
    await logout();
    return null;
  }
}

// ── logout ────────────────────────────────────────────────────────────────────

/**
 * Clears all stored tokens from SecureStore.
 * Does NOT revoke the token server-side (acceptable for this use case).
 */
export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(KEY_REFRESH_TOKEN);
  await SecureStore.deleteItemAsync(KEY_TOKEN_EXPIRY);
}

// ── isAuthenticated ───────────────────────────────────────────────────────────

/**
 * Returns true if a (potentially expired) access token exists in SecureStore.
 * Use getAccessToken() to get a guaranteed-fresh token.
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await SecureStore.getItemAsync(KEY_ACCESS_TOKEN);
  return token !== null;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function _storeTokens(
  tokenResponse: AuthSession.TokenResponse
): Promise<void> {
  if (tokenResponse.accessToken) {
    await SecureStore.setItemAsync(KEY_ACCESS_TOKEN, tokenResponse.accessToken);
  }
  if (tokenResponse.refreshToken) {
    await SecureStore.setItemAsync(KEY_REFRESH_TOKEN, tokenResponse.refreshToken);
  }
  // expiresIn is seconds from now
  const expiry = Date.now() + (tokenResponse.expiresIn ?? 3600) * 1000;
  await SecureStore.setItemAsync(KEY_TOKEN_EXPIRY, expiry.toString());
}
