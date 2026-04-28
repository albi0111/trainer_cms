// ─────────────────────────────────────────────────────────────────────────────
// Sync Queue Service — Internal logic for enqueuing domain updates
// Source of truth: resrc/system_prompt.md §3 & §5.5
// ─────────────────────────────────────────────────────────────────────────────

import { getDB } from '../db/database';
import { SyncDomain } from '../../types';
import { generateId } from '../../utils/id';

/**
 * Enqueues a sync operation for a specific client and set of domains.
 * 
 * Rules (§5.5):
 * 1. Only ONE pending entry per (client_id, operation).
 * 2. If an entry exists and is 'pending', merge domains.
 * 3. Uses UNIQUE(client_id, operation) ON CONFLICT REPLACE.
 */
export async function enqueueClientUpdate(
  clientId: string,
  domains: SyncDomain[],
  dbHandle?: any
): Promise<void> {
  const db = (dbHandle || getDB()) as any;
  const now = new Date().toISOString();

  // 1. Fetch existing pending entry to merge domains if necessary
  // Note: Although schema uses ON CONFLICT REPLACE, we need to merge the 
  // affected_domains array manually to avoid losing previously enqueued domains.
  const existing = await db.getFirstAsync(
    "SELECT affected_domains FROM sync_queue WHERE client_id = ? AND operation = 'update' AND status = 'pending'",
    [clientId]
  );

  let finalDomains = [...domains];
  if (existing) {
    const existingDomains = JSON.parse(existing.affected_domains) as SyncDomain[];
    // Set union
    finalDomains = Array.from(new Set([...existingDomains, ...domains]));
  }

  try {
    await db.runAsync(
      `INSERT INTO sync_queue (
        id, client_id, operation, affected_domains, status, retry_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(client_id, operation) DO UPDATE SET
        affected_domains = excluded.affected_domains,
        updated_at = excluded.updated_at,
        status = 'pending',
        retry_count = 0,
        next_retry_at = NULL`,
      [
        generateId(),
        clientId,
        'update',
        JSON.stringify(finalDomains),
        'pending',
        0,
        now, // Always provide a value for NOT NULL created_at; ON CONFLICT preserves old value
        now
      ]
    );
  } catch (err) {
    console.error(`[enqueueClientUpdate] Failed for client ${clientId}. Domains:`, domains, err);
    throw err;
  }
}
