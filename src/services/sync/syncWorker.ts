// ─────────────────────────────────────────────────────────────────────────────
// Sync Worker — Main logic for processing the sync queue
// Source of truth: resrc/system_prompt.md §5
// ─────────────────────────────────────────────────────────────────────────────

import { getDB } from '../db/database';
import { SyncDomain } from '../../types';
import * as Drive from './driveService';
import { DRIVE_FILE_NAMES } from './constants';
import { nowISO } from '../../utils/date';

let isSyncInProgress = false;

/**
 * Main entrance for starting a sync cycle.
 * §Rule: fetch pending sync_queue and process one by one.
 */
export async function runSync(): Promise<void> {
  if (isSyncInProgress) return;
  isSyncInProgress = true;

  try {
    const db = getDB();
    
    // 1. Ensure Root Folder is ready
    const rootId = await getOrCreateRootFolder();

    // 2. Fetch all pending queue items
    const pendingItems = await db.getAllAsync<{ 
      id: string, 
      client_id: string, 
      affected_domains: string,
      retry_count: number
    }>(
      `SELECT * FROM sync_queue 
       WHERE status = 'pending' 
       OR (status = 'failed' AND retry_count < 3 AND (next_retry_at IS NULL OR next_retry_at <= ?))
       ORDER BY created_at ASC`,
       [nowISO()]
    );

    for (const item of pendingItems) {
      const domains = JSON.parse(item.affected_domains) as SyncDomain[];
      
      try {
        await processQueueItem(item.client_id, domains, rootId);
        
        // Success: Mark as done / delete from queue
        await db.runAsync("DELETE FROM sync_queue WHERE id = ?", [item.id]);
        
        // Update local sync state §5.3
        for (const d of domains) {
          await db.runAsync(
            `INSERT INTO client_domain_sync_state (client_id, domain, updated_at)
             VALUES (?, ?, ?)
             ON CONFLICT(client_id, domain) DO UPDATE SET updated_at = excluded.updated_at`,
            [item.client_id, d, nowISO()]
          );
        }
      } catch (err) {
        console.error(`[SyncWorker] Failed item ${item.id}:`, err);
        const nextRetry = getNextRetryTime(item.retry_count + 1);
        await db.runAsync(
          "UPDATE sync_queue SET status = 'failed', retry_count = retry_count + 1, next_retry_at = ?, updated_at = ? WHERE id = ?",
          [nextRetry, nowISO(), item.id]
        );
      }
    }

    // 3. Finalize Global State (Meta)
    await updateGlobalMeta(rootId);

  } finally {
    isSyncInProgress = false;
  }
}

async function getOrCreateRootFolder(): Promise<string> {
  const existing = await Drive.findFile(DRIVE_FILE_NAMES.ROOT_FOLDER);
  if (existing) return existing.id;
  return await Drive.createFolder(DRIVE_FILE_NAMES.ROOT_FOLDER);
}

async function processQueueItem(clientId: string, domains: SyncDomain[], rootId: string) {
  const db = getDB();
  
  // 1. Find/Create Client Folder
  const clientFolder = await Drive.findFile(clientId, rootId);
  const clientFolderId = clientFolder ? clientFolder.id : await Drive.createFolder(clientId, rootId);

  // 2. Upload Domain Files
  // Domain files FIRST (§5.4 Rule 1)
  for (const domain of domains) {
    const table = domain === 'core' ? 'clients' : domain;
    const data = await db.getAllAsync(`SELECT * FROM ${table} WHERE ${domain === 'core' ? 'id' : 'client_id'} = ?`, [clientId]);
    await Drive.uploadJson(`${domain}.json`, data, clientFolderId);
  }

  // 3. Update Client Index (Index SECOND §5.4 Rule 2)
  const client = await db.getFirstAsync("SELECT * FROM clients WHERE id = ?", [clientId]);
  const index = await Drive.downloadJson<any[]>(rootId + '/clients_index.json') || [];
  const otherClients = index.filter(c => c.id !== clientId);
  await Drive.uploadJson(DRIVE_FILE_NAMES.CLIENTS_INDEX, [...otherClients, client], rootId);
}

async function updateGlobalMeta(rootId: string) {
  // Meta LAST (§5.4 Rule 3)
  const meta = { 
    last_sync_at: nowISO(),
    app_version: '1.0.0' 
  };
  await Drive.uploadJson(DRIVE_FILE_NAMES.META, meta, rootId);
}

/**
 * Downloads and merges data from Drive to local SQLite.
 * §Rule 5.4 Download Flow.
 */
export async function downloadAndMerge(): Promise<void> {
  const root = await Drive.findFile(DRIVE_FILE_NAMES.ROOT_FOLDER);
  if (!root) return;

  // 1. Fetch Remote Hierarchy
  const metaFile = await Drive.findFile(DRIVE_FILE_NAMES.META, root.id);
  if (!metaFile) return;

  const indexFile = await Drive.findFile(DRIVE_FILE_NAMES.CLIENTS_INDEX, root.id);
  if (!indexFile) return;

  const remoteIndex = await Drive.downloadJson<any[]>(indexFile.id);
  if (!remoteIndex) return;

  const db = getDB();

  for (const remoteClient of remoteIndex) {
    const localClient = await db.getFirstAsync<{ version: number }>(
      'SELECT version FROM clients WHERE id = ?',
      [remoteClient.id]
    );

    // If local is missing OR remote has higher version -> Sync
    if (!localClient || remoteClient.version > localClient.version) {
      await syncClientFromRemote(remoteClient.id, root.id);
    }
  }
}

async function syncClientFromRemote(clientId: string, rootId: string) {
  const db = getDB();
  const clientFolder = await Drive.findFile(clientId, rootId);
  if (!clientFolder) return;

  // List of domains to check §3
  const domains: SyncDomain[] = [
    'core', 'measurements', 'sessions', 
    'session_results', 'plans', 'diet_plans'
  ];

  await db.withTransactionAsync(async () => {
    for (const domain of domains) {
      const fileName = `${domain}.json`;
      const file = await Drive.findFile(fileName, clientFolder.id);
      if (!file) continue;

      const remoteData = await Drive.downloadJson<any[]>(file.id);
      if (!remoteData) continue;

      const table = domain === 'core' ? 'clients' : domain;
      
      for (const row of remoteData) {
        // Build dynamic Upsert query
        const columns = Object.keys(row);
        const placeholders = columns.map(() => '?').join(',');
        const updates = columns.map(c => `${c} = excluded.${c}`).join(',');

        await db.runAsync(
          `INSERT INTO ${table} (${columns.join(',')})
           VALUES (${placeholders})
           ON CONFLICT(id${table === 'clients' ? '' : ', client_id' /* simplified for now */}) DO UPDATE SET ${updates}`,
          Object.values(row)
        );
      }
    }
  });
}

function getNextRetryTime(count: number): string {
  const now = new Date();
  const seconds = count === 1 ? 5 : count === 2 ? 30 : 300;
  now.setSeconds(now.getSeconds() + seconds);
  return now.toISOString().split('.')[0] + 'Z';
}
