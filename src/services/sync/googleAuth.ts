const STORAGE_KEYS = {
  accessToken: 'fitpersona.google.access_token',
  expiresAt: 'fitpersona.google.expires_at',
  accountId: 'fitpersona.google.account_id',
  email: 'fitpersona.google.email',
};

export interface GoogleAccountIdentity {
  google_account_id: string;
  google_email: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; expires_in?: number; error?: string }) => void;
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
      return 'Google Drive access was denied. Approve the permission request to enable sync.';
    case 'popup_closed':
    case 'popup_closed_by_user':
      return 'Google sign-in was closed before it finished.';
    case 'popup_failed_to_open':
      return 'Google sign-in popup could not open. Check your browser popup settings.';
    default:
      return 'Google sign-in failed.';
  }
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

function storeToken(token: string, expiresIn = 3600): void {
  localStorage.setItem(STORAGE_KEYS.accessToken, token);
  localStorage.setItem(STORAGE_KEYS.expiresAt, String(Date.now() + expiresIn * 1000));
}

function storeIdentity(identity: GoogleAccountIdentity): void {
  localStorage.setItem(STORAGE_KEYS.accountId, identity.google_account_id);
  localStorage.setItem(STORAGE_KEYS.email, identity.google_email);
}

function clearToken(): void {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.expiresAt);
  localStorage.removeItem(STORAGE_KEYS.accountId);
  localStorage.removeItem(STORAGE_KEYS.email);
}

export function getStoredGoogleAccountIdentity(): GoogleAccountIdentity | null {
  const accountId = localStorage.getItem(STORAGE_KEYS.accountId);
  const email = localStorage.getItem(STORAGE_KEYS.email);

  if (!accountId || !email) {
    return null;
  }

  return {
    google_account_id: accountId,
    google_email: email,
  };
}

export async function fetchGoogleAccountIdentity(token: string): Promise<GoogleAccountIdentity> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Google account lookup failed: ${response.status}`);
  }

  const data = await response.json() as { sub?: string; email?: string };
  if (!data.sub || !data.email) {
    throw new Error('Google account lookup did not include account id and email.');
  }

  const identity = {
    google_account_id: data.sub,
    google_email: data.email,
  };
  storeIdentity(identity);
  return identity;
}

export async function getGoogleAccountIdentity(): Promise<GoogleAccountIdentity | null> {
  const token = getToken();
  if (!token) {
    return null;
  }

  const stored = getStoredGoogleAccountIdentity();
  if (stored) {
    return stored;
  }

  return fetchGoogleAccountIdentity(token);
}

export async function initGoogleAuth(): Promise<void> {
  if (!getClientId()) {
    throw new Error('Missing VITE_GOOGLE_CLIENT_ID.');
  }

  await loadGoogleScript();
}

export async function signIn(): Promise<string> {
  await initGoogleAuth();

  return new Promise((resolve, reject) => {
    const tokenClient = window.google?.accounts.oauth2.initTokenClient({
      client_id: getClientId(),
      scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
      callback: async (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(formatGoogleAuthErrorMessage(response.error || 'unknown')));
          return;
        }

        try {
          storeToken(response.access_token, response.expires_in);
          await fetchGoogleAccountIdentity(response.access_token);
          resolve(response.access_token);
        } catch (error) {
          reject(error);
        }
      },
      error_callback: (error) => {
        reject(new Error(formatGoogleAuthErrorMessage(error.type)));
      },
    });

    if (!tokenClient) {
      reject(new Error('Google Identity Services is unavailable.'));
      return;
    }

    const current = getToken();
    tokenClient.requestAccessToken({ prompt: current ? '' : 'consent' });
  });
}

export function getToken(): string | null {
  const { token, expiresAt } = readStoredToken();
  if (!token || !expiresAt || Date.now() >= expiresAt) {
    clearToken();
    return null;
  }
  return token;
}

export async function signOut(): Promise<void> {
  const token = getToken();
  if (token && window.google?.accounts.oauth2) {
    window.google.accounts.oauth2.revoke(token, () => undefined);
  }
  clearToken();
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}
