import { getCalendarSyncSnapshot } from '../calendar/calendarSyncService';
import { getSyncSnapshot } from '../sync/syncService';
import { getGoogleAuthState, isGoogleAuthenticated } from './googleAuthService';

export interface GoogleStatusSnapshot {
  isConnected: boolean;
  authStatus: 'connected' | 'expired' | 'revoked' | 'failed';
  accountEmail: string | null;
  pendingCount: number;
  drivePendingCount: number;
  calendarPendingCount: number;
  lastSyncedAt: string | null;
  driveLastSyncedAt: string | null;
  calendarLastSyncedAt: string | null;
  lastError: string | null;
  driveLastError: string | null;
  calendarLastError: string | null;
  calendarName: string | null;
  calendarEnabledOnThisDevice: boolean;
}

function latestIso(left?: string | null, right?: string | null): string | null {
  if (!left) {
    return right || null;
  }
  if (!right) {
    return left;
  }
  return left > right ? left : right;
}

export async function getGoogleStatusSnapshot(): Promise<GoogleStatusSnapshot> {
  const [driveSnapshot, calendarSnapshot] = await Promise.all([
    getSyncSnapshot(),
    getCalendarSyncSnapshot(),
  ]);
  const authState = getGoogleAuthState();
  const isConnected = isGoogleAuthenticated();
  const driveError = driveSnapshot.lastError || null;
  const calendarError = calendarSnapshot.lastError || null;

  return {
    isConnected,
    authStatus: authState.auth_status,
    accountEmail: authState.account_email,
    pendingCount: driveSnapshot.pendingCount + calendarSnapshot.pendingCount,
    drivePendingCount: driveSnapshot.pendingCount,
    calendarPendingCount: calendarSnapshot.pendingCount,
    lastSyncedAt: latestIso(driveSnapshot.lastSyncAt, calendarSnapshot.lastSyncAt),
    driveLastSyncedAt: driveSnapshot.lastSyncAt || null,
    calendarLastSyncedAt: calendarSnapshot.lastSyncAt,
    lastError: driveError || calendarError,
    driveLastError: driveError,
    calendarLastError: calendarError,
    calendarName: calendarSnapshot.calendarName,
    calendarEnabledOnThisDevice: calendarSnapshot.enabledOnThisDevice,
  };
}
