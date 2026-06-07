import {
  ensureAccessToken,
  GOOGLE_CALENDAR_CALENDARLIST_SCOPE,
  GOOGLE_CALENDAR_CALENDARS_SCOPE,
  GOOGLE_CALENDAR_EVENTS_SCOPE,
  GOOGLE_DRIVE_SCOPE,
  isAuthenticated,
  readGoogleAuthState,
  signIn,
  signOut,
  type GoogleAuthState,
} from '../sync/googleAuth';

export const GOOGLE_SYNC_SCOPES = [
  GOOGLE_DRIVE_SCOPE,
  GOOGLE_CALENDAR_EVENTS_SCOPE,
  GOOGLE_CALENDAR_CALENDARLIST_SCOPE,
  GOOGLE_CALENDAR_CALENDARS_SCOPE,
];

export async function connectGoogleAuth(): Promise<string> {
  return signIn(GOOGLE_SYNC_SCOPES, { forceConsent: true });
}

export async function ensureValidGoogleAccessToken(): Promise<string> {
  return ensureAccessToken(GOOGLE_SYNC_SCOPES);
}

export async function disconnectGoogleAuth(): Promise<void> {
  await signOut();
}

export function isGoogleAuthenticated(): boolean {
  return isAuthenticated();
}

export function getGoogleAuthState(): GoogleAuthState {
  return readGoogleAuthState();
}
