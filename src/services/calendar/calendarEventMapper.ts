import type { CalendarEvent } from '../../types';
import type { GoogleCalendarEventPayload } from './calendarApiClient';

export const GOOGLE_CALENDAR_TIME_ZONE = 'Asia/Kolkata';

export function toGoogleCalendarEvent(event: CalendarEvent): GoogleCalendarEventPayload {
  return {
    summary: event.title,
    description: event.description,
    start: {
      dateTime: event.scheduled_start_at,
      timeZone: GOOGLE_CALENDAR_TIME_ZONE,
    },
    end: {
      dateTime: event.scheduled_end_at,
      timeZone: GOOGLE_CALENDAR_TIME_ZONE,
    },
    colorId: event.color_id || undefined,
    reminders: {
      useDefault: false,
      overrides: event.reminder_minutes.map((minutes) => ({
        method: 'popup',
        minutes,
      })),
    },
    extendedProperties: {
      private: {
        app: 'fit.persona',
        session_id: event.local_entity_id,
        client_id: event.client_id,
        event_kind: event.event_kind,
        local_calendar_event_id: event.id,
      },
    },
  };
}
