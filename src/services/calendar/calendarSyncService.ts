import { db } from '../../db/db';
import type { AppSettings, CalendarEvent, CalendarSyncQueueEntry } from '../../types';
import { nowIsoUtc } from '../shared/date';
import {
  CalendarApiError,
  createEvent,
  deleteEvent,
  updateEvent,
} from './calendarApiClient';
import { toGoogleCalendarEvent } from './calendarEventMapper';
import { planAllPlannedSessions } from './calendarReminderPlanner';
import { getAppSettings, isCalendarReminderOwner, patchAppSettings } from './calendarSettingsService';
import {
  getPendingCalendarQueue,
  markCalendarQueueEntryFailed,
  markCalendarQueueEntryProcessing,
  removeCalendarQueueEntry,
} from './calendarSyncQueue';

const CALENDAR_RETRY_BACKOFF_SECONDS = [5, 30, 300] as const;
const CALENDAR_MAX_RETRIES = 3;

let activeCalendarSync: Promise<boolean> | null = null;
let scheduledCalendarSyncId: number | null = null;

function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine;
}

function getRetryTime(retryCount: number): string {
  const seconds = CALENDAR_RETRY_BACKOFF_SECONDS[
    Math.min(retryCount - 1, CALENDAR_RETRY_BACKOFF_SECONDS.length - 1)
  ] || 300;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Google Calendar sync failed.';
}

function isMissingGoogleEvent(error: unknown): boolean {
  return error instanceof CalendarApiError && (error.status === 404 || error.status === 410);
}

function shouldSyncQueueEntry(entry: CalendarSyncQueueEntry): boolean {
  if (entry.status === 'pending' || entry.status === 'processing') {
    return true;
  }

  if (entry.status === 'failed' && entry.retry_count < CALENDAR_MAX_RETRIES) {
    return !entry.next_retry_at || entry.next_retry_at <= nowIsoUtc();
  }

  return false;
}

async function markCalendarEventFailed(event: CalendarEvent, retryCount: number, errorMessage: string): Promise<void> {
  await db.calendarEvents.update(event.id, {
    status: 'failed',
    retry_count: retryCount,
    last_error: errorMessage,
    updated_at: nowIsoUtc(),
  });
}

async function processDeleteQueueEntry(
  queueEntry: CalendarSyncQueueEntry,
  event: CalendarEvent,
  calendarId: string,
): Promise<boolean> {
  if (event.google_event_id) {
    try {
      await deleteEvent(calendarId, event.google_event_id);
    } catch (error) {
      if (!isMissingGoogleEvent(error)) {
        throw error;
      }
    }
  }

  await db.calendarEvents.update(event.id, {
    google_calendar_id: calendarId,
    google_event_id: null,
    status: 'deleted',
    retry_count: 0,
    last_error: null,
    updated_at: nowIsoUtc(),
  });
  await removeCalendarQueueEntry(queueEntry.id);
  return true;
}

async function createOrUpdateGoogleEvent(event: CalendarEvent, calendarId: string): Promise<string> {
  const eventBody = toGoogleCalendarEvent({
    ...event,
    google_calendar_id: calendarId,
  });

  if (!event.google_event_id) {
    return (await createEvent(calendarId, eventBody)).id;
  }

  try {
    return (await updateEvent(calendarId, event.google_event_id, eventBody)).id || event.google_event_id;
  } catch (error) {
    if (!isMissingGoogleEvent(error)) {
      throw error;
    }

    return (await createEvent(calendarId, eventBody)).id;
  }
}

async function processCreateOrUpdateQueueEntry(
  queueEntry: CalendarSyncQueueEntry,
  event: CalendarEvent,
  calendarId: string,
): Promise<boolean> {
  const googleEventId = await createOrUpdateGoogleEvent(event, calendarId);

  await db.calendarEvents.update(event.id, {
    google_calendar_id: calendarId,
    google_event_id: googleEventId,
    status: 'synced',
    retry_count: 0,
    last_error: null,
    updated_at: nowIsoUtc(),
  });
  await removeCalendarQueueEntry(queueEntry.id);
  return true;
}

async function processCalendarQueue(settings: AppSettings): Promise<boolean> {
  if (!settings.google_calendar_id) {
    return false;
  }

  const queue = (await getPendingCalendarQueue()).filter(shouldSyncQueueEntry);
  if (queue.length === 0) {
    return false;
  }

  let changed = false;

  for (const queueEntry of queue) {
    const event = await db.calendarEvents.get(queueEntry.calendar_event_local_id);
    if (!event) {
      await removeCalendarQueueEntry(queueEntry.id);
      continue;
    }

    try {
      await markCalendarQueueEntryProcessing(queueEntry.id);

      if (queueEntry.action === 'delete') {
        changed = await processDeleteQueueEntry(queueEntry, event, settings.google_calendar_id) || changed;
        continue;
      }

      changed = await processCreateOrUpdateQueueEntry(queueEntry, event, settings.google_calendar_id) || changed;
    } catch (error) {
      const retryCount = queueEntry.retry_count + 1;
      const errorMessage = getErrorMessage(error);
      await markCalendarQueueEntryFailed(queueEntry.id, retryCount, getRetryTime(retryCount), errorMessage);
      await markCalendarEventFailed(event, retryCount, errorMessage);
      throw error;
    }
  }

  return changed;
}

export function scheduleCalendarBackgroundSync(): void {
  if (scheduledCalendarSyncId !== null) {
    window.clearTimeout(scheduledCalendarSyncId);
  }

  scheduledCalendarSyncId = window.setTimeout(() => {
    scheduledCalendarSyncId = null;
    void runCalendarSync().catch(() => undefined);
  }, 250);
}

export async function runCalendarSync(): Promise<boolean> {
  if (activeCalendarSync) {
    return activeCalendarSync;
  }

  activeCalendarSync = (async () => {
    try {
      if (!isOnline()) {
        return false;
      }

      const settings = await getAppSettings();
      if (!isCalendarReminderOwner(settings)) {
        return false;
      }

      const replanned = await planAllPlannedSessions();
      const synced = await processCalendarQueue(settings);
      await patchAppSettings({
        google_calendar_last_sync_at: nowIsoUtc(),
        google_calendar_last_error: null,
      });

      return replanned || synced;
    } catch (error) {
      await patchAppSettings({
        google_calendar_last_sync_at: nowIsoUtc(),
        google_calendar_last_error: getErrorMessage(error),
      });
      throw error;
    } finally {
      activeCalendarSync = null;
    }
  })();

  return activeCalendarSync;
}

export async function getCalendarSyncSnapshot(): Promise<{
  pendingCount: number;
  isConnected: boolean;
  enabledOnThisDevice: boolean;
  calendarName: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
}> {
  const settings = await getAppSettings();
  return {
    pendingCount: await db.calendarSyncQueue.count(),
    isConnected: settings.google_calendar_connected,
    enabledOnThisDevice: settings.google_calendar_enabled_on_this_device,
    calendarName: settings.google_calendar_name,
    lastSyncAt: settings.google_calendar_last_sync_at,
    lastError: settings.google_calendar_last_error,
  };
}
