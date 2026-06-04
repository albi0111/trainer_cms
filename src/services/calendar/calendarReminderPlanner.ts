import { db } from '../../db/db';
import type { CalendarEvent, CalendarEventKind, Client, Session } from '../../types';
import { getSessionDurationMinutes } from '../shared/clientSnapshotMapper';
import { nowIsoUtc } from '../shared/date';
import { CALENDAR_EVENT_COLORS } from './calendarColors';
import { isCalendarReminderOwner, getAppSettings } from './calendarSettingsService';
import { enqueueCalendarSync } from './calendarSyncQueue';

const KOLKATA_OFFSET_MINUTES = 330;
const MINUTE_MS = 60 * 1000;
const DEFAULT_SESSION_START_TIME = '09:00';
const DEFAULT_SESSION_DURATION_MINUTES = 60;
const FIT_PERSONA_PUBLIC_URL = 'https://fitpersona-beb36.web.app';

interface CalendarEventDraft {
  id: string;
  event_kind: CalendarEventKind;
  scheduled_start_at: string;
  scheduled_end_at: string;
  title: string;
  description: string;
  color_id: string | null;
  reminder_minutes: number[];
}

function getConfiguredBaseUrl(): string {
  const configuredBaseUrl = import.meta.env.VITE_APP_PUBLIC_URL;
  const browserOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  return (configuredBaseUrl || browserOrigin || FIT_PERSONA_PUBLIC_URL).replace(/\/$/, '');
}

function getClientDeepLink(clientId: string): string {
  return `${getConfiguredBaseUrl()}/client/${clientId}`;
}

function finiteNumber(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function parseDateParts(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split('-').map(Number);
  return {
    year: finiteNumber(year, 1970),
    month: finiteNumber(month, 1),
    day: finiteNumber(day, 1),
  };
}

function parseTimeParts(time?: string): { hour: number; minute: number } {
  const [hour, minute] = (time || DEFAULT_SESSION_START_TIME).split(':').map(Number);
  return {
    hour: finiteNumber(hour, 9),
    minute: finiteNumber(minute, 0),
  };
}

function toKolkataUtcMillis(date: string, time?: string): number {
  const { year, month, day } = parseDateParts(date);
  const { hour, minute } = parseTimeParts(time);
  return Date.UTC(year, month - 1, day, hour, minute, 0) - KOLKATA_OFFSET_MINUTES * MINUTE_MS;
}

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

function toKolkataRfc3339(utcMillis: number): string {
  const kolkataDate = new Date(utcMillis + KOLKATA_OFFSET_MINUTES * MINUTE_MS);
  const year = kolkataDate.getUTCFullYear();
  const month = padDatePart(kolkataDate.getUTCMonth() + 1);
  const day = padDatePart(kolkataDate.getUTCDate());
  const hour = padDatePart(kolkataDate.getUTCHours());
  const minute = padDatePart(kolkataDate.getUTCMinutes());
  const second = padDatePart(kolkataDate.getUTCSeconds());
  return `${year}-${month}-${day}T${hour}:${minute}:${second}+05:30`;
}

function addDaysIso(date: string, days: number): string {
  const { year, month, day } = parseDateParts(date);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function getSessionStartMillis(session: Session): number {
  return toKolkataUtcMillis(session.date, session.start_time);
}

function getSessionEndMillis(session: Session): number {
  const startMillis = getSessionStartMillis(session);

  if (session.end_time) {
    const endMillis = toKolkataUtcMillis(session.date, session.end_time);
    if (endMillis > startMillis) {
      return endMillis;
    }
  }

  return startMillis + getSessionDurationMinutes({
    start_time: session.start_time,
    end_time: session.end_time,
    duration_minutes: session.duration_minutes || DEFAULT_SESSION_DURATION_MINUTES,
  }) * MINUTE_MS;
}

function uniqueReminderMinutes(reminderMinutes: number[]): number[] {
  const seen = new Set<number>();
  const unique: number[] = [];

  for (const minutes of reminderMinutes) {
    if (!Number.isFinite(minutes) || minutes < 0 || seen.has(minutes)) {
      continue;
    }
    seen.add(minutes);
    unique.push(minutes);
  }

  return unique;
}

function getMainReminderMinutes(session: Session, startMillis: number): number[] {
  const reminderMinutes = [60];
  const previousDate = addDaysIso(session.date, -1);
  const previousEveningMillis = toKolkataUtcMillis(previousDate, '18:00');

  if (previousEveningMillis > Date.now()) {
    reminderMinutes.push(Math.round((startMillis - previousEveningMillis) / MINUTE_MS));
  }

  return uniqueReminderMinutes(reminderMinutes);
}

function formatDisplayDateTime(rfc3339DateTime: string): string {
  return new Date(rfc3339DateTime).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatSessionType(type: Session['type']): string {
  return `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
}

function getCalendarEventId(sessionId: string, eventKind: CalendarEventKind): string {
  return `${sessionId}:${eventKind}`;
}

function getMainSessionTitle(session: Session, client: Client): string {
  const suffix = session.measure_reminder ? 'Session + Measurements' : 'Training Session';

  if (session.status === 'completed') {
    return `✅ Completed: ${client.name} - ${suffix}`;
  }

  if (session.status === 'missed') {
    return `❌ Missed: ${client.name} - ${suffix}`;
  }

  if (session.measure_reminder) {
    return `📏 fit.persona: ${client.name} - ${suffix}`;
  }

  return `fit.persona: ${client.name} - ${suffix}`;
}

function getMainSessionColor(session: Session): string {
  if (session.status === 'completed') {
    return CALENDAR_EVENT_COLORS.completed;
  }

  if (session.status === 'missed') {
    return CALENDAR_EVENT_COLORS.missed;
  }

  return session.measure_reminder
    ? CALENDAR_EVENT_COLORS.sessionWithMeasurement
    : CALENDAR_EVENT_COLORS.sessionNormal;
}

function buildMainSessionDescription(
  session: Session,
  client: Client,
  startAt: string,
  endAt: string,
): string {
  const lines = [
    `Training session for ${client.name}`,
    '',
  ];

  if (session.measure_reminder) {
    lines.push(
      'Important:',
      'Take body measurements at the end of this session.',
      'Do not complete the session without checking measurements if required.',
      '',
    );
  }

  if (session.status === 'completed') {
    lines.push('Status:', 'Completed in fit.persona.', '');
  }

  if (session.status === 'missed') {
    lines.push('Status:', 'Missed in fit.persona.', '');
    if (session.missed_reason) {
      lines.push('Missed reason:', session.missed_reason.replace(/_/g, ' '), '');
    }
    if (session.missed_note) {
      lines.push('Missed note:', session.missed_note, '');
    }
  }

  if (session.original_date || session.postponed_note) {
    lines.push('Postponed:', `Original date: ${session.original_date || 'N/A'}`);
    if (session.postponed_note) {
      lines.push(`Reason: ${session.postponed_note}`);
    }
    lines.push('');
  }

  lines.push(
    'Time:',
    `${formatDisplayDateTime(startAt)} - ${formatDisplayDateTime(endAt)}`,
    '',
    'Focus:',
    session.focus || 'Training session',
    '',
    'Session Type:',
    formatSessionType(session.type),
  );

  if (session.notes) {
    lines.push('', 'Session notes:', session.notes);
  }

  lines.push('', 'Open fit.persona:', getClientDeepLink(client.id), '', `Session ID: ${session.id}`);

  return lines.join('\n');
}

function buildCompletionCheckDescription(session: Session, client: Client, startAt: string, endAt: string): string {
  return [
    'Session ended recently.',
    '',
    'Please mark this session as:',
    '- Completed',
    '- Missed',
    '- Postponed',
    '',
    'Client:',
    client.name,
    '',
    'Session:',
    `${formatDisplayDateTime(startAt)} - ${formatDisplayDateTime(endAt)}`,
    '',
    'Open fit.persona:',
    getClientDeepLink(client.id),
    '',
    `Session ID: ${session.id}`,
  ].join('\n');
}

function buildCompletionSnoozeDescription(session: Session, client: Client): string {
  return [
    'This session is still not marked.',
    '',
    'Please update the session status:',
    '- Completed',
    '- Missed',
    '- Postponed',
    '',
    'Client:',
    client.name,
    '',
    'Open fit.persona:',
    getClientDeepLink(client.id),
    '',
    `Session ID: ${session.id}`,
  ].join('\n');
}

function buildMainSessionEvent(session: Session, client: Client): CalendarEventDraft {
  const startMillis = getSessionStartMillis(session);
  const endMillis = getSessionEndMillis(session);
  const startAt = toKolkataRfc3339(startMillis);
  const endAt = toKolkataRfc3339(endMillis);

  return {
    id: getCalendarEventId(session.id, 'session_main'),
    event_kind: 'session_main',
    scheduled_start_at: startAt,
    scheduled_end_at: endAt,
    title: getMainSessionTitle(session, client),
    description: buildMainSessionDescription(session, client, startAt, endAt),
    color_id: getMainSessionColor(session),
    reminder_minutes: session.status === 'planned' ? getMainReminderMinutes(session, startMillis) : [],
  };
}

function buildCompletionCheckEvent(session: Session, client: Client): CalendarEventDraft {
  const sessionStartMillis = getSessionStartMillis(session);
  const sessionEndMillis = getSessionEndMillis(session);
  const startMillis = sessionEndMillis + 5 * MINUTE_MS;
  const endMillis = sessionEndMillis + 10 * MINUTE_MS;

  return {
    id: getCalendarEventId(session.id, 'session_completion_check'),
    event_kind: 'session_completion_check',
    scheduled_start_at: toKolkataRfc3339(startMillis),
    scheduled_end_at: toKolkataRfc3339(endMillis),
    title: `⚠️ fit.persona: Mark ${client.name}'s session`,
    description: buildCompletionCheckDescription(
      session,
      client,
      toKolkataRfc3339(sessionStartMillis),
      toKolkataRfc3339(sessionEndMillis),
    ),
    color_id: CALENDAR_EVENT_COLORS.completionCheck,
    reminder_minutes: [0],
  };
}

function getRollingSnoozeStartMillis(sessionEndMillis: number): number {
  let snoozeStartMillis = sessionEndMillis + 60 * MINUTE_MS;
  const now = Date.now();

  while (snoozeStartMillis <= now) {
    snoozeStartMillis += 60 * MINUTE_MS;
  }

  return snoozeStartMillis;
}

function buildCompletionSnoozeEvent(session: Session, client: Client): CalendarEventDraft {
  const snoozeStartMillis = getRollingSnoozeStartMillis(getSessionEndMillis(session));

  return {
    id: getCalendarEventId(session.id, 'session_completion_snooze'),
    event_kind: 'session_completion_snooze',
    scheduled_start_at: toKolkataRfc3339(snoozeStartMillis),
    scheduled_end_at: toKolkataRfc3339(snoozeStartMillis + 5 * MINUTE_MS),
    title: `🔁 fit.persona: Still need to mark ${client.name}'s session`,
    description: buildCompletionSnoozeDescription(session, client),
    color_id: CALENDAR_EVENT_COLORS.completionSnooze,
    reminder_minutes: [0],
  };
}

function buildDesiredCalendarEvents(session: Session, client: Client): CalendarEventDraft[] {
  const mainEvent = buildMainSessionEvent(session, client);

  if (session.status !== 'planned') {
    return [mainEvent];
  }

  return [
    mainEvent,
    buildCompletionCheckEvent(session, client),
    buildCompletionSnoozeEvent(session, client),
  ];
}

function didCalendarEventChange(existing: CalendarEvent, draft: CalendarEventDraft, calendarId: string): boolean {
  return (
    existing.google_calendar_id !== calendarId
    || existing.event_kind !== draft.event_kind
    || existing.scheduled_start_at !== draft.scheduled_start_at
    || existing.scheduled_end_at !== draft.scheduled_end_at
    || existing.title !== draft.title
    || existing.description !== draft.description
    || existing.color_id !== draft.color_id
    || existing.reminder_minutes.join(',') !== draft.reminder_minutes.join(',')
  );
}

async function upsertCalendarEvent(
  session: Session,
  draft: CalendarEventDraft,
  calendarId: string,
): Promise<boolean> {
  const existing = await db.calendarEvents.get(draft.id);
  const now = nowIsoUtc();

  if (existing?.status === 'synced' && !didCalendarEventChange(existing, draft, calendarId)) {
    return false;
  }

  const action = existing?.google_event_id ? 'update' : 'create';
  const nextEvent: CalendarEvent = {
    id: draft.id,
    local_entity_type: 'session',
    local_entity_id: session.id,
    client_id: session.client_id,
    google_calendar_id: calendarId,
    google_event_id: existing?.google_event_id || null,
    event_kind: draft.event_kind,
    status: action === 'create' ? 'pending_create' : 'pending_update',
    scheduled_start_at: draft.scheduled_start_at,
    scheduled_end_at: draft.scheduled_end_at,
    title: draft.title,
    description: draft.description,
    color_id: draft.color_id,
    reminder_minutes: draft.reminder_minutes,
    last_error: null,
    retry_count: existing?.retry_count || 0,
    created_at: existing?.created_at || now,
    updated_at: now,
  };

  await db.calendarEvents.put(nextEvent);
  return enqueueCalendarSync(nextEvent, action);
}

async function deleteCalendarEvent(event: CalendarEvent): Promise<boolean> {
  if (event.status === 'deleted') {
    return false;
  }

  const nextEvent: CalendarEvent = {
    ...event,
    status: event.google_event_id ? 'pending_delete' : 'deleted',
    last_error: null,
    updated_at: nowIsoUtc(),
  };

  await db.calendarEvents.put(nextEvent);
  return enqueueCalendarSync(nextEvent, 'delete');
}

async function getPlanningCalendarId(): Promise<string | null> {
  const settings = await getAppSettings();
  return isCalendarReminderOwner(settings) ? settings.google_calendar_id : null;
}

async function loadSessionContext(sessionId: string): Promise<{ session: Session; client: Client } | null> {
  const session = await db.sessions.get(sessionId);
  if (!session) {
    return null;
  }

  const client = await db.clients.get(session.client_id);
  if (!client) {
    return null;
  }

  return { session, client };
}

async function syncDesiredCalendarEvents(
  session: Session,
  client: Client,
  calendarId: string,
): Promise<boolean> {
  const desiredEvents = buildDesiredCalendarEvents(session, client);
  const desiredById = new Map(desiredEvents.map((event) => [event.id, event]));
  let queued = false;

  await db.transaction('rw', [db.calendarEvents, db.calendarSyncQueue], async () => {
    const existingEvents = await db.calendarEvents
      .where('local_entity_id')
      .equals(session.id)
      .toArray();

    for (const desiredEvent of desiredEvents) {
      queued = await upsertCalendarEvent(session, desiredEvent, calendarId) || queued;
    }

    for (const existingEvent of existingEvents) {
      if (!desiredById.has(existingEvent.id)) {
        queued = await deleteCalendarEvent(existingEvent) || queued;
      }
    }
  });

  return queued;
}

export async function planForSession(sessionId: string): Promise<boolean> {
  return replanForSession(sessionId);
}

export async function replanForSession(sessionId: string): Promise<boolean> {
  const calendarId = await getPlanningCalendarId();
  if (!calendarId) {
    return false;
  }

  const context = await loadSessionContext(sessionId);
  if (!context) {
    return false;
  }

  return syncDesiredCalendarEvents(context.session, context.client, calendarId);
}

export async function onSessionCompleted(sessionId: string): Promise<boolean> {
  return replanForSession(sessionId);
}

export async function onSessionMissed(sessionId: string): Promise<boolean> {
  return replanForSession(sessionId);
}

export async function onSessionReverted(sessionId: string): Promise<boolean> {
  return replanForSession(sessionId);
}

export async function onSessionDeleted(sessionId: string): Promise<boolean> {
  const calendarId = await getPlanningCalendarId();
  if (!calendarId) {
    return false;
  }

  let queued = false;
  await db.transaction('rw', [db.calendarEvents, db.calendarSyncQueue], async () => {
    const existingEvents = await db.calendarEvents
      .where('local_entity_id')
      .equals(sessionId)
      .toArray();

    for (const existingEvent of existingEvents) {
      queued = await deleteCalendarEvent({
        ...existingEvent,
        google_calendar_id: existingEvent.google_calendar_id || calendarId,
      }) || queued;
    }
  });

  return queued;
}

export async function planAllPlannedSessions(): Promise<boolean> {
  const calendarId = await getPlanningCalendarId();
  if (!calendarId) {
    return false;
  }

  const sessions = await db.sessions.where('status').equals('planned').toArray();
  if (sessions.length === 0) {
    return false;
  }

  const clients = await db.clients.bulkGet(Array.from(new Set(sessions.map((session) => session.client_id))));
  const clientsById = new Map<string, Client>();
  for (const client of clients) {
    if (client) {
      clientsById.set(client.id, client);
    }
  }
  let queued = false;

  for (const session of sessions) {
    const client = clientsById.get(session.client_id);
    if (!client) {
      continue;
    }
    queued = await syncDesiredCalendarEvents(session, client, calendarId) || queued;
  }

  return queued;
}
