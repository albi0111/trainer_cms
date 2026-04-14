// ─────────────────────────────────────────────────────────────────────────────
// Sync Worker — Main engine for background synchronization
// Source of truth: resrc/system_prompt.md §5, §12
// ─────────────────────────────────────────────────────────────────────────────

import { getDB } from '../db/database';
import { SyncDomain, SyncQueueEntry } from '../../types';
import * as Drive from './driveService';
import { getAccessToken } from '../auth/googleAuth';
import { DRIVE_FILE_NAMES } from './constants';
import { nowISO } from '../../utils/date';
import * as FileSystem from 'expo-file-system';

let isSyncInProgress = false;

interface DomainSyncResult {
  domain: SyncDomain;
  drive_file_id: string;
  updated_at: string;
}

interface ClientIndexEntry {
  client_id: string;
  version: number;
  files: Record<string, string>;
  domain_updated_at: Record<string, string>;
  updated_at: string;
}

interface GlobalMeta {
  last_global_update: string;
  last_index_update: string;
  last_media_update: string;
}

/**
 * Main entrance for starting a sync cycle.
 * §Rule 5.3: Device → Drive (Upload Flow)
 * §Rule 5.4: Drive → Device (Download Flow)
 * §Rule 5.6: Delete Flow
 */
export async function runSync(): Promise<void> {
  if (isSyncInProgress) return;
  isSyncInProgress = true;

  try {
    const db = getDB();
    const rootId = await getOrCreateRootFolder();

    // ── STEP 1: UPLOAD/DELETE FLOW (§5.3 & §5.6) ──────────────────────────────
    
    // Poll pending queue items
    const pendingItems = await db.getAllAsync<SyncQueueEntry>(
      `SELECT * FROM sync_queue 
       WHERE status = 'pending' 
       OR (status = 'failed' AND retry_count < 3 AND (next_retry_at IS NULL OR next_retry_at <= ?))
       ORDER BY created_at ASC`,
      [nowISO()]
    );

    if (pendingItems.length > 0) {
      // Fetch current index
      let index = await Drive.downloadJson<ClientIndexEntry[]>(
        await _getFileId(DRIVE_FILE_NAMES.CLIENTS_INDEX, rootId)
      ) || [];

      for (const item of pendingItems) {
        try {
          // Mark as processing
          await db.runAsync("UPDATE sync_queue SET status = 'processing' WHERE id = ?", [item.id]);

          if (item.operation === 'delete') {
            // EXECUTE DELETE FLOW (§5.6)
            await hardDeleteClient(item.client_id, rootId);
            
            // Remove from index
            index = index.filter(e => e.client_id !== item.client_id);
            await Drive.uploadJson(DRIVE_FILE_NAMES.CLIENTS_INDEX, index, rootId);
            
            // Update Meta
            await updateGlobalMeta(rootId, true, true);
          } else {
            // EXECUTE UPLOAD FLOW (§5.3)
            const domains = typeof item.affected_domains === 'string' 
              ? JSON.parse(item.affected_domains) 
              : item.affected_domains;

            const results = await processQueueItem(item.client_id, domains, rootId);

            // Success: Update Index
            const client = await db.getFirstAsync<{ version: number }>(
              "SELECT version FROM clients WHERE id = ?", [item.client_id]
            );
            
            const existingEntry = index.find(e => e.client_id === item.client_id);
            const newEntry: ClientIndexEntry = {
              client_id: item.client_id,
              version: client?.version || 1,
              files: existingEntry?.files || {},
              domain_updated_at: existingEntry?.domain_updated_at || {},
              updated_at: nowISO(),
            };

            for (const res of results) {
              newEntry.files[res.domain] = res.drive_file_id;
              newEntry.domain_updated_at[res.domain] = res.updated_at;
            }

            index = [
              ...index.filter(e => e.client_id !== item.client_id),
              newEntry
            ];

            await Drive.uploadJson(DRIVE_FILE_NAMES.CLIENTS_INDEX, index, rootId);
            await updateGlobalMeta(rootId, true, domains.includes('progress_photos'));

            // Finalize local state (§5.3 Step 7)
            await db.withTransactionAsync(async () => {
              for (const res of results) {
                await db.runAsync(
                  `INSERT INTO client_domain_sync_state (client_id, domain, updated_at)
                   VALUES (?, ?, ?)
                   ON CONFLICT(client_id, domain) DO UPDATE SET updated_at = excluded.updated_at`,
                  [item.client_id, res.domain, res.updated_at]
                );
              }
            });
          }

          // Shared success path: remove from queue
          await db.runAsync("DELETE FROM sync_queue WHERE id = ?", [item.id]);

        } catch (err) {
          console.error(`[SyncWorker] Flow failed for ${item.client_id}:`, err);
          const retryCount = item.retry_count + 1;
          const nextRetry = getNextRetryTime(retryCount);
          await db.runAsync(
            `UPDATE sync_queue SET 
              status = ?, 
              retry_count = ?, 
              next_retry_at = ?, 
              updated_at = ? 
             WHERE id = ?`,
            [retryCount >= 3 ? 'failed' : 'pending', retryCount, nextRetry, nowISO(), item.id]
          );
        }
      }
    }

    // ── STEP 2: DOWNLOAD FLOW (§5.4) ─────────────────────────────────────────
    await downloadAndMerge(rootId);

  } catch (err) {
    console.error('[SyncWorker] Global sync error:', err);
  } finally {
    isSyncInProgress = false;
  }
}

/**
 * Executes a hard delete on Drive and local storage.
 * §Rule 5.6: Delete actual photos first, then JSON files, then local.
 */
async function hardDeleteClient(clientId: string, rootId: string) {
  const db = getDB();
  const clientFolder = await Drive.findFile(clientId, rootId);
  
  if (clientFolder) {
    // 1. Fetch progress_photos.json to get binary IDs (§5.6 Step 2.1)
    const photosFile = await Drive.findFile('progress_photos.json', clientFolder.id);
    if (photosFile) {
      const photos = await Drive.downloadJson<any[]>(photosFile.id);
      if (photos) {
        // 2. Delete binary photos (§5.6 Step 2.2)
        const token = await getAccessToken();
        for (const photo of photos) {
          if (photo.drive_file_id) {
            await fetch(`https://www.googleapis.com/drive/v3/files/${photo.drive_file_id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
          }
        }
      }
    }

    // 3. Delete the entire client folder (cleans up all domain JSONs) (§5.6 Step 2.3)
    const token = await getAccessToken();
    await fetch(`https://www.googleapis.com/drive/v3/files/${clientFolder.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  // 4. Hard delete from local SQLite (§5.6 Step 2.6)
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM clients WHERE id = ?", [clientId]);
    await db.runAsync("DELETE FROM client_profiles WHERE client_id = ?", [clientId]);
    await db.runAsync("DELETE FROM client_lifestyles WHERE client_id = ?", [clientId]);
    await db.runAsync("DELETE FROM client_assessments WHERE client_id = ?", [clientId]);
    await db.runAsync("DELETE FROM measurements WHERE client_id = ?", [clientId]);
    await db.runAsync("DELETE FROM sessions WHERE client_id = ?", [clientId]);
    await db.runAsync("DELETE FROM plans WHERE client_id = ?", [clientId]);
    await db.runAsync("DELETE FROM diet_plans WHERE client_id = ?", [clientId]);
    await db.runAsync("DELETE FROM progress_photos WHERE client_id = ?", [clientId]);
    await db.runAsync("DELETE FROM sync_queue WHERE client_id = ?", [clientId]);
    await db.runAsync("DELETE FROM client_domain_sync_state WHERE client_id = ?", [clientId]);
  });

  // 5. Delete from FileSystem (§5.6 Step 2.7)
  const dir = `${FileSystem.documentDirectory}clients/${clientId}`;
  const info = await FileSystem.getInfoAsync(dir);
  if (info.exists) {
    await FileSystem.deleteAsync(dir);
  }
}

/**
 * Downloads and merges data from Drive to local SQLite.
 * §Rule 5.4 Download Flow.
 */
async function downloadAndMerge(rootId: string): Promise<void> {
  const db = getDB();

  // 1. Fetch meta.json
  const metaId = await _getFileId(DRIVE_FILE_NAMES.META, rootId);
  if (!metaId) return;
  const remoteMeta = await Drive.downloadJson<GlobalMeta>(metaId);
  if (!remoteMeta) return;

  // 2. Fetch clients_index.json
  const indexId = await _getFileId(DRIVE_FILE_NAMES.CLIENTS_INDEX, rootId);
  if (!indexId) return;
  const index = await Drive.downloadJson<ClientIndexEntry[]>(indexId);
  if (!index) return;

  // 3. For each client
  for (const entry of index) {
    const localClient = await db.getFirstAsync<{ version: number, sync_status: string }>(
      'SELECT version, sync_status FROM clients WHERE id = ?',
      [entry.client_id]
    );

    // Skip clients pending delete locally
    if (localClient?.sync_status === 'pending_delete') continue;

    // a. Version check first (§5.4 Step 4.a)
    if (localClient && localClient.version >= entry.version) {
      continue; // Skip: local is up to date or ahead
    }

    // b. Domain timestamp check second (§5.4 Step 4.b)
    for (const domain of Object.keys(entry.domain_updated_at) as SyncDomain[]) {
      const localSync = await db.getFirstAsync<{ updated_at: string }>(
        'SELECT updated_at FROM client_domain_sync_state WHERE client_id = ? AND domain = ?',
        [entry.client_id, domain]
      );
      const localUpdatedAt = localSync?.updated_at || '1970-01-01T00:00:00Z';

      if (entry.domain_updated_at[domain] > localUpdatedAt) {
        const fileId = entry.files[domain];
        if (!fileId) continue;

        const remoteData = await Drive.downloadJson<any>(fileId);
        if (!remoteData) continue;

        await mergeDomainIntoLocal(entry.client_id, domain, remoteData);
        
        await db.runAsync(
          `INSERT INTO client_domain_sync_state (client_id, domain, updated_at)
           VALUES (?, ?, ?)
           ON CONFLICT(client_id, domain) DO UPDATE SET updated_at = excluded.updated_at`,
          [entry.client_id, domain, entry.domain_updated_at[domain]]
        );
      }
    }

    // Finalize client version
    await db.runAsync(
      "UPDATE clients SET version = ?, updated_at = ? WHERE id = ?",
      [entry.version, entry.updated_at, entry.client_id]
    );
  }
  
  // Clean up: Check for local clients NOT in index (Deletes) (§5.6 Step 3)
  const localClients = await db.getAllAsync<{ id: string, sync_status: string }>("SELECT id, sync_status FROM clients");
  for (const lc of localClients) {
    if (lc.sync_status === 'pending_delete') continue;
    if (!index.find(e => e.client_id === lc.id)) {
      // Hard delete locally (§5.6 Device B)
      await db.withTransactionAsync(async () => {
        await db.runAsync("DELETE FROM clients WHERE id = ?", [lc.id]);
        await db.runAsync("DELETE FROM client_profiles WHERE client_id = ?", [lc.id]);
        await db.runAsync("DELETE FROM client_lifestyles WHERE client_id = ?", [lc.id]);
        await db.runAsync("DELETE FROM client_assessments WHERE client_id = ?", [lc.id]);
        await db.runAsync("DELETE FROM measurements WHERE client_id = ?", [lc.id]);
        await db.runAsync("DELETE FROM sessions WHERE client_id = ?", [lc.id]);
        await db.runAsync("DELETE FROM plans WHERE client_id = ?", [lc.id]);
        await db.runAsync("DELETE FROM diet_plans WHERE client_id = ?", [lc.id]);
        await db.runAsync("DELETE FROM progress_photos WHERE client_id = ?", [lc.id]);
        await db.runAsync("DELETE FROM client_domain_sync_state WHERE client_id = ?", [lc.id]);
      });
      // Delete photos dir
      const dir = `${FileSystem.documentDirectory}clients/${lc.id}`;
      if ((await FileSystem.getInfoAsync(dir)).exists) {
        await FileSystem.deleteAsync(dir);
      }
    }
  }
}

async function mergeDomainIntoLocal(clientId: string, domain: SyncDomain, data: any) {
  const db = getDB();

  await db.withTransactionAsync(async () => {
    if (domain === 'core') {
      const { client, profile, lifestyle, assessment } = data;
      
      await db.runAsync(
        `INSERT INTO clients (id, name, phone, email, goal, version, sync_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET 
          name=excluded.name, phone=excluded.phone, email=excluded.email, 
          goal=excluded.goal, version=excluded.version, updated_at=excluded.updated_at`,
        [client.id, client.name, client.phone, client.email, client.goal, client.version, 'synced', client.created_at, client.updated_at]
      );

      if (profile) {
        await db.runAsync(
          `INSERT INTO client_profiles (client_id, age, gender, height_cm, initial_weight_kg, medical_notes, photo_uri, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(client_id) DO UPDATE SET 
            age=excluded.age, gender=excluded.gender, height_cm=excluded.height_cm, 
            initial_weight_kg=excluded.initial_weight_kg, medical_notes=excluded.medical_notes, 
            photo_uri=excluded.photo_uri, updated_at=excluded.updated_at`,
          [clientId, profile.age, profile.gender, profile.height_cm, profile.initial_weight_kg, profile.medical_notes, profile.photo_uri, profile.updated_at]
        );
      }

      if (lifestyle) {
        await db.runAsync(
          `INSERT INTO client_lifestyles (client_id, sleep_hours_avg, stress_level, activity_level, diet_type, water_intake_liters, smoking, alcohol, job_type, notes, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(client_id) DO UPDATE SET 
            sleep_hours_avg=excluded.sleep_hours_avg, stress_level=excluded.stress_level, 
            activity_level=excluded.activity_level, diet_type=excluded.diet_type, 
            water_intake_liters=excluded.water_intake_liters, smoking=excluded.smoking, alcohol=excluded.alcohol, 
            job_type=excluded.job_type, notes=excluded.notes, updated_at=excluded.updated_at`,
          [clientId, lifestyle.sleep_hours_avg, lifestyle.stress_level, lifestyle.activity_level, lifestyle.diet_type, lifestyle.water_intake_liters, lifestyle.smoking ? 1 : 0, lifestyle.alcohol ? 1 : 0, lifestyle.job_type, lifestyle.notes, lifestyle.updated_at]
        );
      }

      if (assessment) {
        await db.runAsync(
          `INSERT INTO client_assessments (client_id, assessed_at, bp_systolic, bp_diastolic, resting_heart_rate, vitals_remarks, exercises_json, cardio_time_minutes, cardio_distance_km, cardio_mhr, flexibility_json, objectives, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(client_id) DO UPDATE SET 
            assessed_at=excluded.assessed_at, bp_systolic=excluded.bp_systolic, bp_diastolic=excluded.bp_diastolic, 
            resting_heart_rate=excluded.resting_heart_rate, vitals_remarks=excluded.vitals_remarks, 
            exercises_json=excluded.exercises_json, cardio_time_minutes=excluded.cardio_time_minutes, 
            cardio_distance_km=excluded.cardio_distance_km, cardio_mhr=excluded.cardio_mhr, 
            flexibility_json=excluded.flexibility_json, objectives=excluded.objectives, updated_at=excluded.updated_at`,
          [clientId, assessment.assessed_at, assessment.bp_systolic, assessment.bp_diastolic, assessment.resting_heart_rate, assessment.vitals_remarks, assessment.exercises_json, assessment.cardio_time_minutes, assessment.cardio_distance_km, assessment.cardio_mhr, assessment.flexibility_json, assessment.objectives, assessment.updated_at]
        );
      }
    } else if (domain === 'progress_photos') {
      for (const remote of data) {
        const local = await db.getFirstAsync<{ id: string, uri: string }>(
          "SELECT id, uri FROM progress_photos WHERE id = ?", [remote.id]
        );
        if (local) {
          await db.runAsync(
            `UPDATE progress_photos SET 
              type = ?, note = ?, drive_file_id = ?, upload_status = ?, date = ?
             WHERE id = ?`,
            [remote.type, remote.note, remote.drive_file_id, 'uploaded', remote.date, remote.id]
          );
        } else {
          await db.runAsync(
            `INSERT INTO progress_photos (id, client_id, uri, date, type, note, file_size_bytes, drive_file_id, upload_status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [remote.id, clientId, remote.uri, remote.date, remote.type, remote.note, remote.file_size_bytes, remote.drive_file_id, 'uploaded', remote.created_at]
          );
        }
      }
    } else {
      const table = _domainToTable(domain);
      await db.runAsync(`DELETE FROM ${table} WHERE client_id = ?`, [clientId]);
      for (const row of data) {
        const cols = Object.keys(row);
        const placeholders = cols.map(() => '?').join(',');
        await db.runAsync(
          `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`,
          Object.values(row)
        );
      }
    }
  });
}

async function processQueueItem(clientId: string, domains: SyncDomain[], rootId: string): Promise<DomainSyncResult[]> {
  const db = getDB();
  const results: DomainSyncResult[] = [];

  const clientFolder = await Drive.findFile(clientId, rootId);
  const clientFolderId = clientFolder ? clientFolder.id : await Drive.createFolder(clientId, rootId);

  if (domains.includes('progress_photos')) {
    await syncPhotosForClient(clientId, clientFolderId);
  }

  for (const domain of domains) {
    let data: any;
    if (domain === 'core') {
      data = {
        client: await db.getFirstAsync("SELECT * FROM clients WHERE id = ?", [clientId]),
        profile: await db.getFirstAsync("SELECT * FROM client_profiles WHERE client_id = ?", [clientId]),
        lifestyle: await db.getFirstAsync("SELECT * FROM client_lifestyles WHERE client_id = ?", [clientId]),
        assessment: await db.getFirstAsync("SELECT * FROM client_assessments WHERE client_id = ?", [clientId]),
      };
    } else {
      const table = _domainToTable(domain);
      data = await db.getAllAsync(`SELECT * FROM ${table} WHERE client_id = ?`, [clientId]);
    }

    const fileId = await Drive.uploadJson(`${domain}.json`, data, clientFolderId);
    results.push({
      domain,
      drive_file_id: fileId,
      updated_at: nowISO(),
    });
  }

  return results;
}

async function syncPhotosForClient(clientId: string, clientFolderId: string) {
  const db = getDB();
  const photos = await db.getAllAsync<{ id: string, uri: string }>(
    `SELECT id, uri FROM progress_photos 
     WHERE client_id = ? AND upload_status = 'local'`,
    [clientId]
  );
  
  if (photos.length === 0) return;

  const token = await getAccessToken();

  for (const photo of photos) {
    try {
      const blob = await (await fetch(photo.uri)).blob();
      const metadata = {
        name: `photo_${photo.id}.jpg`,
        parents: [clientFolderId],
        mimeType: 'image/jpeg',
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

      const resp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const driveFile = await resp.json();

      if (driveFile.id) {
        await db.runAsync(
          "UPDATE progress_photos SET drive_file_id = ?, upload_status = 'uploaded' WHERE id = ?",
          [driveFile.id, photo.id]
        );
      }
    } catch (err) {
      console.error(`[SyncWorker] Photo binary upload failed: ${photo.id}`, err);
    }
  }
}

async function updateGlobalMeta(rootId: string, indexUpdated: boolean, mediaUpdated: boolean) {
  const metaId = await _getFileId(DRIVE_FILE_NAMES.META, rootId);
  const current = metaId ? await Drive.downloadJson<GlobalMeta>(metaId) : null;
  
  const now = nowISO();
  const meta: GlobalMeta = {
    last_global_update: now,
    last_index_update: indexUpdated ? now : (current?.last_index_update || now),
    last_media_update: mediaUpdated ? now : (current?.last_media_update || now),
  };

  await Drive.uploadJson(DRIVE_FILE_NAMES.META, meta, rootId);
}

// ── UTILS ────────────────────────────────────────────────────────────────────

async function getOrCreateRootFolder(): Promise<string> {
  const existing = await Drive.findFile(DRIVE_FILE_NAMES.ROOT_FOLDER);
  if (existing) return existing.id;
  return await Drive.createFolder(DRIVE_FILE_NAMES.ROOT_FOLDER);
}

async function _getFileId(name: string, parentId: string): Promise<string> {
  const file = await Drive.findFile(name, parentId);
  return file?.id || '';
}

function _domainToTable(domain: SyncDomain): string {
  if (domain === 'session_results') return 'session_results';
  if (domain === 'progress_photos') return 'progress_photos';
  if (domain === 'diet_plans') return 'diet_plans';
  return domain;
}

function getNextRetryTime(count: number): string {
  const seconds = count === 1 ? 5 : count === 2 ? 30 : 300;
  const d = new Date();
  d.setSeconds(d.getSeconds() + seconds);
  return d.toISOString();
}
