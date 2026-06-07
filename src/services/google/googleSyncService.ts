import { runCalendarSync } from '../calendar/calendarSyncService';
import { runSyncCycle } from '../sync/syncService';
import { ensureValidGoogleAccessToken } from './googleAuthService';

export type GoogleSyncSource = 'manual' | 'background' | 'startup';
export type GoogleSyncPartStatus = 'success' | 'failed' | 'skipped';
export type GoogleSyncOverallStatus = 'success' | 'partial_failed' | 'failed' | 'auth_required';

export interface GoogleSyncResult {
  overallStatus: GoogleSyncOverallStatus;
  driveStatus: GoogleSyncPartStatus;
  calendarStatus: GoogleSyncPartStatus;
  driveChanged: boolean;
  calendarChanged: boolean;
  driveError: string | null;
  calendarError: string | null;
  lastAttemptAt: string;
}

let activeGoogleSync: Promise<GoogleSyncResult> | null = null;
let scheduledGoogleSyncId: number | null = null;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Google sync failed.';
}

function buildOverallStatus(
  driveStatus: GoogleSyncPartStatus,
  calendarStatus: GoogleSyncPartStatus,
): GoogleSyncOverallStatus {
  if (driveStatus === 'success' && calendarStatus === 'success') {
    return 'success';
  }

  if (driveStatus === 'failed' && calendarStatus === 'failed') {
    return 'failed';
  }

  return 'partial_failed';
}

export async function runGoogleSync(
  _options: { source: GoogleSyncSource } = { source: 'manual' },
): Promise<GoogleSyncResult> {
  if (activeGoogleSync) {
    return activeGoogleSync;
  }

  const syncPromise = (async (): Promise<GoogleSyncResult> => {
    const lastAttemptAt = new Date().toISOString();

    try {
      await ensureValidGoogleAccessToken();
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      return {
        overallStatus: 'auth_required',
        driveStatus: 'failed',
        calendarStatus: 'failed',
        driveChanged: false,
        calendarChanged: false,
        driveError: errorMessage,
        calendarError: errorMessage,
        lastAttemptAt,
      };
    }

    let driveChanged = false;
    let calendarChanged = false;
    let driveError: string | null = null;
    let calendarError: string | null = null;

    try {
      driveChanged = await runSyncCycle();
    } catch (error) {
      driveError = getErrorMessage(error);
    }

    try {
      calendarChanged = await runCalendarSync();
    } catch (error) {
      calendarError = getErrorMessage(error);
    }

    const driveStatus: GoogleSyncPartStatus = driveError ? 'failed' : 'success';
    const calendarStatus: GoogleSyncPartStatus = calendarError ? 'failed' : 'success';

    return {
      overallStatus: buildOverallStatus(driveStatus, calendarStatus),
      driveStatus,
      calendarStatus,
      driveChanged,
      calendarChanged,
      driveError,
      calendarError,
      lastAttemptAt,
    };
  })().finally(() => {
    activeGoogleSync = null;
  });

  activeGoogleSync = syncPromise;
  return syncPromise;
}

export function scheduleGoogleBackgroundSync(): void {
  if (scheduledGoogleSyncId !== null) {
    window.clearTimeout(scheduledGoogleSyncId);
  }

  scheduledGoogleSyncId = window.setTimeout(() => {
    scheduledGoogleSyncId = null;
    void runGoogleSync({ source: 'background' }).catch(() => undefined);
  }, 250);
}
