import { ensureDriveLayout } from '../sync/driveService';
import { disconnectFitPersonaCalendar, ensureFitPersonaCalendar } from '../calendar/calendarSetupService';
import { planAllPlannedSessions } from '../calendar/calendarReminderPlanner';
import { connectGoogleAuth, disconnectGoogleAuth } from './googleAuthService';
import { runGoogleSync, type GoogleSyncResult } from './googleSyncService';

export async function connectGoogle(): Promise<GoogleSyncResult> {
  await connectGoogleAuth();
  await ensureDriveLayout();
  await ensureFitPersonaCalendar();
  await planAllPlannedSessions();
  return runGoogleSync({ source: 'manual' });
}

export async function disconnectGoogle(): Promise<void> {
  await disconnectGoogleAuth();
  await disconnectFitPersonaCalendar();
}
