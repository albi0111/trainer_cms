import { ensureDriveLayout } from '../sync/driveService';
import { disconnectFitPersonaCalendar, ensureFitPersonaCalendar } from '../calendar/calendarSetupService';
import { planAllPlannedSessions } from '../calendar/calendarReminderPlanner';
import { patchAppSettings } from '../calendar/calendarSettingsService';
import { connectGoogleAuth, disconnectGoogleAuth } from './googleAuthService';
import { runGoogleSync, type GoogleSyncResult } from './googleSyncService';

export async function connectGoogle(): Promise<void> {
  await connectGoogleAuth();
  await ensureDriveLayout();
  await patchAppSettings({ google_drive_sync_enabled: true });
  await ensureFitPersonaCalendar();
}

export async function runPostConnectGoogleSync(): Promise<GoogleSyncResult> {
  await planAllPlannedSessions();
  return runGoogleSync({ source: 'manual' });
}

export async function disconnectGoogle(): Promise<void> {
  await disconnectGoogleAuth();
  await disconnectFitPersonaCalendar();
}
