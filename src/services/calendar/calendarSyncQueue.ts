import Dexie, { type Table } from 'dexie';
import { db } from '../../db/db';
import type {
  CalendarEvent,
  CalendarSyncQueueAction,
  CalendarSyncQueueEntry,
} from '../../types';
import { generateId } from '../../utils/id';
import { nowIsoUtc } from '../shared/date';

function getCalendarSyncQueueTable(): Table<CalendarSyncQueueEntry, string> {
  const transactionTable = Dexie.currentTransaction?.table('calendarSyncQueue') as Table<CalendarSyncQueueEntry, string> | undefined;
  return transactionTable || db.calendarSyncQueue;
}

function collapseCalendarAction(
  existingAction: CalendarSyncQueueAction | null,
  requestedAction: CalendarSyncQueueAction,
  event: CalendarEvent,
): CalendarSyncQueueAction | null {
  if (requestedAction === 'delete' && !event.google_event_id && !existingAction) {
    return null;
  }

  if (!existingAction) {
    return requestedAction;
  }

  if (existingAction === 'create' && requestedAction === 'update') {
    return 'create';
  }

  if (existingAction === 'create' && requestedAction === 'delete') {
    return null;
  }

  if (existingAction === 'update' && requestedAction === 'delete') {
    return 'delete';
  }

  if (existingAction === 'delete' && requestedAction !== 'delete') {
    return event.google_event_id ? 'update' : 'create';
  }

  if (requestedAction === 'create') {
    return event.google_event_id ? 'update' : 'create';
  }

  return requestedAction;
}

async function getOpenCalendarQueueEntries(calendarEventLocalId: string): Promise<CalendarSyncQueueEntry[]> {
  return getCalendarSyncQueueTable()
    .where('calendar_event_local_id')
    .equals(calendarEventLocalId)
    .filter((entry) => entry.status !== 'done')
    .toArray();
}

export async function enqueueCalendarSync(
  event: CalendarEvent,
  action: CalendarSyncQueueAction,
): Promise<boolean> {
  const calendarSyncQueue = getCalendarSyncQueueTable();
  const existingEntries = await getOpenCalendarQueueEntries(event.id);
  const existingEntry = existingEntries[0];
  const nextAction = collapseCalendarAction(existingEntry?.action || null, action, event);

  if (existingEntries.length > 1) {
    await calendarSyncQueue.bulkDelete(existingEntries.slice(1).map((entry) => entry.id));
  }

  if (!nextAction) {
    if (existingEntry) {
      await calendarSyncQueue.delete(existingEntry.id);
    }
    return false;
  }

  const now = nowIsoUtc();
  await calendarSyncQueue.put({
    id: existingEntry?.id || generateId(),
    calendar_event_local_id: event.id,
    local_entity_type: event.local_entity_type,
    local_entity_id: event.local_entity_id,
    client_id: event.client_id,
    action: nextAction,
    status: 'pending',
    retry_count: existingEntry?.retry_count || 0,
    last_error: null,
    next_retry_at: null,
    created_at: existingEntry?.created_at || now,
    updated_at: now,
  });

  return true;
}

export async function getPendingCalendarQueue(): Promise<CalendarSyncQueueEntry[]> {
  const queue = await db.calendarSyncQueue.toArray();
  return queue.sort((left, right) => left.updated_at.localeCompare(right.updated_at));
}

export async function removeCalendarQueueEntry(id: string): Promise<void> {
  await db.calendarSyncQueue.delete(id);
}

export async function markCalendarQueueEntryProcessing(id: string): Promise<void> {
  await db.calendarSyncQueue.update(id, {
    status: 'processing',
    updated_at: nowIsoUtc(),
  });
}

export async function markCalendarQueueEntryFailed(
  id: string,
  retryCount: number,
  nextRetryAt: string,
  errorMessage: string,
): Promise<void> {
  await db.calendarSyncQueue.update(id, {
    status: 'failed',
    retry_count: retryCount,
    next_retry_at: nextRetryAt,
    last_error: errorMessage,
    updated_at: nowIsoUtc(),
  });
}
