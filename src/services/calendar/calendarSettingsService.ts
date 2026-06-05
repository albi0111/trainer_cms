import { APP_SETTINGS_ID, DEFAULT_APP_SETTINGS } from '../../constants/appSettings';
import { db } from '../../db/db';
import type { AppSettings } from '../../types';

function normalizeAppSettings(settings?: Partial<AppSettings>): AppSettings {
  return {
    ...DEFAULT_APP_SETTINGS,
    ...settings,
    id: APP_SETTINGS_ID,
    google_drive_sync_enabled: settings?.google_drive_sync_enabled !== false,
    google_calendar_connected: Boolean(settings?.google_calendar_connected),
    google_calendar_id: settings?.google_calendar_id || null,
    google_calendar_name: settings?.google_calendar_name || null,
    google_calendar_account_email: settings?.google_calendar_account_email || null,
    google_calendar_connected_at: settings?.google_calendar_connected_at || null,
    google_calendar_last_sync_at: settings?.google_calendar_last_sync_at || null,
    google_calendar_last_error: settings?.google_calendar_last_error || null,
    google_calendar_enabled_on_this_device: Boolean(settings?.google_calendar_enabled_on_this_device),
  };
}

export async function getAppSettings(): Promise<AppSettings> {
  const settings = normalizeAppSettings(await db.appSettings.get(APP_SETTINGS_ID));
  await db.appSettings.put(settings);
  return settings;
}

export async function patchAppSettings(patch: Partial<Omit<AppSettings, 'id'>>): Promise<AppSettings> {
  const settings = normalizeAppSettings({
    ...(await getAppSettings()),
    ...patch,
  });
  await db.appSettings.put(settings);
  return settings;
}

export function isCalendarReminderOwner(settings: AppSettings): boolean {
  return Boolean(
    settings.google_calendar_connected
    && settings.google_calendar_enabled_on_this_device
    && settings.google_calendar_id,
  );
}
