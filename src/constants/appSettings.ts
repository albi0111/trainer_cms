import type { AppSettings } from '../types';

export const APP_SETTINGS_ID = 'default';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: APP_SETTINGS_ID,
  google_drive_sync_enabled: true,
  google_calendar_connected: false,
  google_calendar_id: null,
  google_calendar_name: null,
  google_calendar_account_email: null,
  google_calendar_connected_at: null,
  google_calendar_last_sync_at: null,
  google_calendar_last_error: null,
  google_calendar_enabled_on_this_device: false,
};
