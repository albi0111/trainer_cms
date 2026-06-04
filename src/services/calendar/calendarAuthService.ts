import {
  getToken,
  GOOGLE_CALENDAR_SCOPE,
  GOOGLE_DRIVE_SCOPE,
  isAuthenticated,
  signIn,
} from '../sync/googleAuth';

export async function connectCalendarAuth(): Promise<string> {
  return signIn([GOOGLE_DRIVE_SCOPE, GOOGLE_CALENDAR_SCOPE]);
}

export function getCalendarToken(): string | null {
  return getToken();
}

export function isCalendarAuthenticated(): boolean {
  return isAuthenticated();
}
