import { nowIsoUtc } from '../shared/date';
import { connectCalendarAuth } from './calendarAuthService';
import {
  createCalendar,
  listCalendars,
  type GoogleCalendarListEntry,
} from './calendarApiClient';
import { GOOGLE_CALENDAR_TIME_ZONE } from './calendarEventMapper';
import { getAppSettings, patchAppSettings } from './calendarSettingsService';

export const FIT_PERSONA_CALENDAR_NAME = 'fit.persona Sessions';

function findFitPersonaCalendar(calendars: GoogleCalendarListEntry[]): GoogleCalendarListEntry | undefined {
  return calendars.find((calendar) => calendar.summary === FIT_PERSONA_CALENDAR_NAME);
}

export async function ensureFitPersonaCalendar(): Promise<GoogleCalendarListEntry> {
  await connectCalendarAuth();

  const settings = await getAppSettings();
  const calendars = await listCalendars();
  const calendar = findFitPersonaCalendar(calendars) || await createCalendar({
    summary: FIT_PERSONA_CALENDAR_NAME,
    description: 'Session and reminder calendar for fit.persona',
    timeZone: GOOGLE_CALENDAR_TIME_ZONE,
  });

  await patchAppSettings({
    google_calendar_connected: true,
    google_calendar_id: calendar.id,
    google_calendar_name: calendar.summary,
    google_calendar_account_email: settings.google_calendar_account_email,
    google_calendar_connected_at: settings.google_calendar_connected_at || nowIsoUtc(),
    google_calendar_last_error: null,
    google_calendar_enabled_on_this_device: true,
  });

  return calendar;
}

export async function disconnectFitPersonaCalendar(): Promise<void> {
  await patchAppSettings({
    google_calendar_connected: false,
    google_calendar_id: null,
    google_calendar_name: null,
    google_calendar_account_email: null,
    google_calendar_connected_at: null,
    google_calendar_last_error: null,
    google_calendar_enabled_on_this_device: false,
  });
}

export async function setFitPersonaCalendarEnabledOnThisDevice(enabled: boolean): Promise<void> {
  await patchAppSettings({
    google_calendar_enabled_on_this_device: enabled,
    google_calendar_last_error: null,
  });
}
