import { getCalendarToken } from './calendarAuthService';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole?: string;
}

interface GoogleCalendarListResponse {
  items?: GoogleCalendarListEntry[];
  nextPageToken?: string;
}

export interface GoogleCalendarDateTime {
  dateTime: string;
  timeZone: string;
}

export interface GoogleCalendarReminderOverride {
  method: 'popup';
  minutes: number;
}

export interface GoogleCalendarEventPayload {
  summary: string;
  description: string;
  start: GoogleCalendarDateTime;
  end: GoogleCalendarDateTime;
  colorId?: string;
  reminders: {
    useDefault: false;
    overrides: GoogleCalendarReminderOverride[];
  };
  extendedProperties: {
    private: Record<string, string>;
  };
}

export interface GoogleCalendarEventResponse {
  id: string;
  summary?: string;
}

export class CalendarApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'CalendarApiError';
    this.status = status;
  }
}

function parseJson(text: string): unknown {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function readGoogleErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const castPayload = payload as Record<string, unknown>;
  const error = castPayload.error;
  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  const errorDescription = castPayload.error_description;
  return typeof errorDescription === 'string' && errorDescription.trim() ? errorDescription : null;
}

function buildCalendarPath(path: string): string {
  return `${CALENDAR_API_BASE}${path}`;
}

async function calendarRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getCalendarToken();
  if (!token) {
    throw new CalendarApiError('Google Calendar is not connected.', 401);
  }

  const response = await fetch(buildCalendarPath(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  const text = await response.text();
  const payload = parseJson(text);

  if (!response.ok) {
    throw new CalendarApiError(
      readGoogleErrorMessage(payload) || `Google Calendar API failed with ${response.status}.`,
      response.status,
    );
  }

  return payload as T;
}

export async function listCalendars(): Promise<GoogleCalendarListEntry[]> {
  const calendars: GoogleCalendarListEntry[] = [];
  let pageToken: string | null = null;

  do {
    const searchParams = new URLSearchParams({
      maxResults: '250',
      minAccessRole: 'writer',
    });
    if (pageToken) {
      searchParams.set('pageToken', pageToken);
    }

    const response = await calendarRequest<GoogleCalendarListResponse>(`/users/me/calendarList?${searchParams.toString()}`);
    calendars.push(...(response.items || []));
    pageToken = response.nextPageToken || null;
  } while (pageToken);

  return calendars;
}

export async function createCalendar(input: {
  summary: string;
  description: string;
  timeZone: string;
}): Promise<GoogleCalendarListEntry> {
  return calendarRequest<GoogleCalendarListEntry>('/calendars', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function createEvent(
  calendarId: string,
  eventBody: GoogleCalendarEventPayload,
): Promise<GoogleCalendarEventResponse> {
  return calendarRequest<GoogleCalendarEventResponse>(`/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    body: JSON.stringify(eventBody),
  });
}

export async function updateEvent(
  calendarId: string,
  eventId: string,
  eventBody: GoogleCalendarEventPayload,
): Promise<GoogleCalendarEventResponse> {
  return calendarRequest<GoogleCalendarEventResponse>(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(eventBody),
    },
  );
}

export async function deleteEvent(calendarId: string, eventId: string): Promise<void> {
  await calendarRequest<void>(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
  });
}

export async function getEvent(calendarId: string, eventId: string): Promise<GoogleCalendarEventResponse> {
  return calendarRequest<GoogleCalendarEventResponse>(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
  );
}
