const STORAGE_KEYS = {
  accessToken: 'fitpersona.google.access_token',
  expiresAt: 'fitpersona.google.expires_at',
  authState: 'fitpersona.google.auth_state',
};

export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const GOOGLE_CALENDAR_EVENTS_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
export const GOOGLE_CALENDAR_CALENDARLIST_SCOPE = 'https://www.googleapis.com/auth/calendar.calendarlist';
export const GOOGLE_CALENDAR_CALENDARS_SCOPE = 'https://www.googleapis.com/auth/calendar.calendars';

const DEFAULT_GOOGLE_AUTH_SCOPES = [GOOGLE_DRIVE_SCOPE];
const TOKEN_EXPIRY_BUFFER_MS = 2 * 60 * 1000;

export type GoogleAuthStatus = 'connected' | 'expired' | 'revoked' | 'failed';

export interface GoogleAuthState {
  provider: 'google';
  account_email: string | null;
  access_token: string | null;
  access_token_expires_at: string | null;
  refresh_token: string | null;
  granted_scopes: string[];
  connected_at: string | null;
  updated_at: string | null;
  auth_status: GoogleAuthStatus;
}

const EMPTY_GOOGLE_AUTH_STATE: GoogleAuthState = {
  provider: 'google',
  account_email: null,
  access_token: null,
  access_token_expires_at: null,
  refresh_token: null,
  granted_scopes: [],
  connected_at: null,
  updated_at: null,
  auth_status: 'revoked',
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            include_granted_scopes?: boolean;
            callback: (response: { access_token?: string; expires_in?: number; error?: string; scope?: string }) => void;
            error_callback?: (error: { type: 'popup_failed_to_open' | 'popup_closed' | 'unknown' }) => void;
          }): {
            requestAccessToken(options?: { prompt?: string }): void;
          };
          revoke(token: string, callback?: () => void): void;
        };
      };
    };
  }
}

let googleScriptPromise: Promise<void> | null = null;

function formatGoogleAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'access_denied':
      return 'Google access was denied. Approve the permission request to enable sync and reminders.';
    case 'popup_closed':
    case 'popup_closed_by_user':
      return 'Google sign-in was closed before it finished.';
    case 'popup_failed_to_open':
      return 'Google sign-in popup could not open. Check your browser popup settings.';
    default:
      return 'Google sign-in failed.';
  }
}

function formatGoogleScopes(scopes: string[]): string {
  return Array.from(new Set(scopes)).join(' ');
}

function parseGoogleScopes(scopeText?: string): string[] {
  if (!scopeText) {
    return [];
  }

  return scopeText.split(/\s+/).map((scope) => scope.trim()).filter(Boolean);
}

function mergeGoogleScopes(left: string[], right: string[]): string[] {
  return Array.from(new Set([...left, ...right]));
}

function getClientId(): string {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
}

function loadGoogleScript(): Promise<void> {
  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services.'));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

function readStoredToken(): { token: string | null; expiresAt: number } {
  const token = localStorage.getItem(STORAGE_KEYS.accessToken);
  const expiresAt = Number(localStorage.getItem(STORAGE_KEYS.expiresAt) || '0');
  return { token, expiresAt };
}

function toIsoFromNow(expiresIn = 3600): string {
  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

function toExpiresAtMillis(expiresAt: string | null): number {
  return expiresAt ? Date.parse(expiresAt) : 0;
}

function isAccessTokenUsable(expiresAt: string | null): boolean {
  return toExpiresAtMillis(expiresAt) - TOKEN_EXPIRY_BUFFER_MS > Date.now();
}

function storeLegacyToken(token: string, expiresAtIso: string): void {
  localStorage.setItem(STORAGE_KEYS.accessToken, token);
  localStorage.setItem(STORAGE_KEYS.expiresAt, String(toExpiresAtMillis(expiresAtIso)));
}

function storeGoogleAuthState(state: GoogleAuthState): void {
  localStorage.setItem(STORAGE_KEYS.authState, JSON.stringify(state));
  if (state.access_token && state.access_token_expires_at) {
    storeLegacyToken(state.access_token, state.access_token_expires_at);
  }
}

function clearToken(): void {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.expiresAt);
  localStorage.removeItem(STORAGE_KEYS.authState);
}

export function readGoogleAuthState(): GoogleAuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.authState);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GoogleAuthState>;
      return {
        ...EMPTY_GOOGLE_AUTH_STATE,
        ...parsed,
        provider: 'google',
        account_email: parsed.account_email || null,
        access_token: parsed.access_token || null,
        access_token_expires_at: parsed.access_token_expires_at || null,
        refresh_token: parsed.refresh_token || null,
        granted_scopes: Array.isArray(parsed.granted_scopes) ? parsed.granted_scopes : [],
        connected_at: parsed.connected_at || null,
        updated_at: parsed.updated_at || null,
        auth_status: parsed.auth_status || 'revoked',
      };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEYS.authState);
  }

  const legacyToken = readStoredToken();
  if (legacyToken.token && legacyToken.expiresAt > Date.now()) {
    const now = new Date().toISOString();
    return {
      ...EMPTY_GOOGLE_AUTH_STATE,
      access_token: legacyToken.token,
      access_token_expires_at: new Date(legacyToken.expiresAt).toISOString(),
      granted_scopes: DEFAULT_GOOGLE_AUTH_SCOPES,
      connected_at: now,
      updated_at: now,
      auth_status: 'connected',
    };
  }

  return EMPTY_GOOGLE_AUTH_STATE;
}

function hasGrantedScopes(state: GoogleAuthState, scopes: string[]): boolean {
  return scopes.every((scope) => state.granted_scopes.includes(scope));
}

function markGoogleAuthState(patch: Partial<GoogleAuthState>): GoogleAuthState {
  const now = new Date().toISOString();
  const nextState: GoogleAuthState = {
    ...readGoogleAuthState(),
    ...patch,
    provider: 'google',
    updated_at: now,
  };
  storeGoogleAuthState(nextState);
  return nextState;
}

export async function initGoogleAuth(): Promise<void> {
  if (!getClientId()) {
    throw new Error('Missing VITE_GOOGLE_CLIENT_ID.');
  }

  await loadGoogleScript();
}

export async function signIn(
  scopes: string[] = DEFAULT_GOOGLE_AUTH_SCOPES,
  options: { forceConsent?: boolean } = {},
): Promise<string> {
  await initGoogleAuth();

  return new Promise((resolve, reject) => {
    const currentState = readGoogleAuthState();
    const tokenClient = window.google?.accounts.oauth2.initTokenClient({
      client_id: getClientId(),
      scope: formatGoogleScopes(scopes),
      include_granted_scopes: true,
      callback: (response) => {
        if (response.error || !response.access_token) {
          markGoogleAuthState({ auth_status: 'failed' });
          reject(new Error(formatGoogleAuthErrorMessage(response.error || 'unknown')));
          return;
        }

        const now = new Date().toISOString();
        const accessTokenExpiresAt = toIsoFromNow(response.expires_in);
        const grantedScopes = mergeGoogleScopes(
          currentState.granted_scopes,
          mergeGoogleScopes(scopes, parseGoogleScopes(response.scope)),
        );
        storeGoogleAuthState({
          ...currentState,
          access_token: response.access_token,
          access_token_expires_at: accessTokenExpiresAt,
          granted_scopes: grantedScopes,
          connected_at: currentState.connected_at || now,
          updated_at: now,
          auth_status: 'connected',
        });
        resolve(response.access_token);
      },
      error_callback: (error) => {
        markGoogleAuthState({ auth_status: 'failed' });
        reject(new Error(formatGoogleAuthErrorMessage(error.type)));
      },
    });

    if (!tokenClient) {
      reject(new Error('Google Identity Services is unavailable.'));
      return;
    }

    tokenClient.requestAccessToken({ prompt: options.forceConsent ? 'consent' : '' });
  });
}

export async function ensureAccessToken(scopes: string[] = DEFAULT_GOOGLE_AUTH_SCOPES): Promise<string> {
  const currentState = readGoogleAuthState();
  if (
    currentState.access_token
    && isAccessTokenUsable(currentState.access_token_expires_at)
    && hasGrantedScopes(currentState, scopes)
  ) {
    return currentState.access_token;
  }

  if (currentState.auth_status !== 'connected' && currentState.auth_status !== 'expired') {
    throw new Error('Google connection expired. Please reconnect Google.');
  }

  try {
    return await signIn(scopes);
  } catch (error) {
    markGoogleAuthState({ auth_status: 'expired' });
    throw error;
  }
}

export function getToken(): string | null {
  const state = readGoogleAuthState();
  if (!state.access_token || !isAccessTokenUsable(state.access_token_expires_at)) {
    if (state.auth_status === 'connected') {
      markGoogleAuthState({ auth_status: 'expired' });
    }
    return null;
  }
  return state.access_token;
}

export async function signOut(): Promise<void> {
  const token = getToken();
  if (token && window.google?.accounts.oauth2) {
    window.google.accounts.oauth2.revoke(token, () => undefined);
  }
  clearToken();
}

export function isAuthenticated(): boolean {
  const state = readGoogleAuthState();
  return (
    (state.auth_status === 'connected' || state.auth_status === 'expired')
    && state.granted_scopes.length > 0
  );
}
