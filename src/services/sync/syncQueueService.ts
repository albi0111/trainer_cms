import Dexie, { type Table } from 'dexie';
import { db } from '../../db/db';
import type { SyncDomain, SyncQueueEntry, SyncQueueOperation } from '../../types';
import { generateId } from '../../utils/id';
import { nowIsoUtc } from '../shared/date';

function getSyncQueueTable(): Table<SyncQueueEntry, string> {
  const transactionTable = Dexie.currentTransaction?.table('syncQueue') as Table<SyncQueueEntry, string> | undefined;
  return transactionTable || db.syncQueue;
}

async function getExistingQueueEntry(
  clientId: string,
  operation: SyncQueueOperation,
): Promise<SyncQueueEntry | undefined> {
  return getSyncQueueTable().where('[client_id+operation]').equals([clientId, operation]).first();
}

export async function enqueueClientUpdate(clientId: string, domains: SyncDomain[]): Promise<void> {
  const syncQueue = getSyncQueueTable();
  const now = nowIsoUtc();
  const existing = await getExistingQueueEntry(clientId, 'update');
  const affectedDomains = Array.from(new Set([...(existing?.affected_domains || []), ...domains]));

  await syncQueue.put({
    id: existing?.id || generateId(),
    client_id: clientId,
    operation: 'update',
    affected_domains: affectedDomains,
    status: 'pending',
    retry_count: existing?.retry_count || 0,
    next_retry_at: null,
    created_at: existing?.created_at || now,
    updated_at: now,
  });
}

export async function enqueueClientDelete(clientId: string): Promise<void> {
  const syncQueue = getSyncQueueTable();
  const now = nowIsoUtc();
  const existing = await getExistingQueueEntry(clientId, 'delete');

  await syncQueue.put({
    id: existing?.id || generateId(),
    client_id: clientId,
    operation: 'delete',
    affected_domains: [],
    status: 'pending',
    retry_count: existing?.retry_count || 0,
    next_retry_at: null,
    created_at: existing?.created_at || now,
    updated_at: now,
  });
}

export async function getPendingQueue(): Promise<SyncQueueEntry[]> {
  const queue = await db.syncQueue.toArray();
  return queue.sort((left, right) => left.updated_at.localeCompare(right.updated_at));
}

export async function getPendingSyncCount(): Promise<number> {
  return db.syncQueue.count();
}

export async function removeQueueEntry(id: string): Promise<void> {
  await db.syncQueue.delete(id);
}

export async function markQueueEntryFailed(id: string, retryCount: number, nextRetryAt: string): Promise<void> {
  await db.syncQueue.update(id, {
    status: 'failed',
    retry_count: retryCount,
    next_retry_at: nextRetryAt,
    updated_at: nowIsoUtc(),
  });
}

export async function markQueueEntryProcessing(id: string): Promise<void> {
  await db.syncQueue.update(id, {
    status: 'processing',
    updated_at: nowIsoUtc(),
  });
}
