import {
  getToken,
  isAuthenticated,
} from '../sync/googleAuth';
import { ensureValidGoogleAccessToken } from '../google/googleAuthService';

export async function connectCalendarAuth(): Promise<string> {
  return ensureValidGoogleAccessToken();
}

export function getCalendarToken(): string | null {
  return getToken();
}

export function isCalendarAuthenticated(): boolean {
  return isAuthenticated();
}
