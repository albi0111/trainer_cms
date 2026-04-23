// ─────────────────────────────────────────────────────────────────────────────
// Client Service — Handles all Client-related persistence
// Source of truth: resrc/system_prompt.md §2, §3, §5.3
// ─────────────────────────────────────────────────────────────────────────────

import { getDB } from '../db/database';
import { Client, ClientProfile, ClientLifestyle, ClientAssessment, Gender } from '../../types';
import { generateId } from '../../utils/id';
import { enqueueClientUpdate } from '../sync/syncQueueService';

// ── CRUD Logic (Internal) ───────────────────────────────────────────────────
// These functions do NOT use transactions. 
// They are intended to be wrapped by public API or internal batch operations.

async function _updateProfile(db: any, clientId: string, payload: Partial<ClientProfile>, now: string) {
  const fields = Object.keys(payload).filter(k => k !== 'client_id' && k !== 'updated_at');
  if (fields.length === 0) return;
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => (payload as any)[f]);
  try {
    await db.runAsync(
      `UPDATE client_profiles SET ${setClause}, updated_at = ? WHERE client_id = ?`,
      [...values, now, clientId]
    );
  } catch (err) {
    console.error(`[_updateProfile] Failed for client ${clientId}. SQL: UPDATE client_profiles SET ${setClause}. Values:`, [...values, now, clientId], err);
    throw err;
  }
}

async function _updateLifestyle(db: any, clientId: string, payload: Partial<any>, now: string) {
  const fields = Object.keys(payload).filter(k => k !== 'client_id' && k !== 'updated_at');
  if (fields.length === 0) return;
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => (payload as any)[f]);
  try {
    await db.runAsync(
      `UPDATE client_lifestyles SET ${setClause}, updated_at = ? WHERE client_id = ?`,
      [...values, now, clientId]
    );
  } catch (err) {
    console.error(`[_updateLifestyle] Failed for client ${clientId}. SQL: UPDATE client_lifestyles SET ${setClause}. Values:`, [...values, now, clientId], err);
    throw err;
  }
}

async function _updateAssessment(db: any, clientId: string, payload: Partial<any>, now: string) {
  const fields = Object.keys(payload).filter(k => 
    k !== 'client_id' && k !== 'updated_at' && k !== 'exercises' && k !== 'flexibility'
  );
  
  const setParts: string[] = fields.map(f => `${f} = ?`);
  const values: any[] = fields.map(f => (payload as any)[f]);

  if (payload.exercises) {
    setParts.push('exercises_json = ?');
    values.push(JSON.stringify(payload.exercises));
  }
  if (payload.flexibility) {
    setParts.push('flexibility_json = ?');
    values.push(JSON.stringify(payload.flexibility));
  }

  if (setParts.length === 0) return;

  const setClause = setParts.join(', ');
  try {
    await db.runAsync(
      `UPDATE client_assessments SET ${setClause}, updated_at = ? WHERE client_id = ?`,
      [...values, now, clientId]
    );
  } catch (err) {
    console.error(`[_updateAssessment] Failed for client ${clientId}. SQL: UPDATE client_assessments SET ${setClause}. Values:`, [...values, now, clientId], err);
    throw err;
  }
}

async function _updateCore(db: any, clientId: string, payload: any, now: string) {
  const fields = Object.keys(payload).filter(k => k !== 'id' && k !== 'version' && k !== 'updated_at');
  if (fields.length > 0) {
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => (payload as any)[f]);
    try {
      await db.runAsync(
        `UPDATE clients SET ${setClause}, version = version + 1, updated_at = ? WHERE id = ?`,
        [...values, now, clientId]
      );
    } catch (err) {
      console.error(`[_updateCore] Failed for client ${clientId}. SQL: UPDATE clients SET ${setClause}. Values:`, [...values, now, clientId], err);
      throw err;
    }
  } else {
    await db.runAsync(
      'UPDATE clients SET version = version + 1, updated_at = ? WHERE id = ?',
      [now, clientId]
    );
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Creates a new client and all secondary records.
 */
export async function createClient(params: {
  name: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  email?: string;
  medicalNotes?: string;
  height?: number;
  initialWeight?: number;
  primaryGoal?: string;
  lifestyle?: { notes?: string };
  assessment?: {
    bp_systolic?: number | null;
    bp_diastolic?: number | null;
    resting_heart_rate?: number | null;
    cardio_time_minutes?: number | null;
    cardio_distance_km?: number | null;
    cardio_mhr?: number | null;
    objectives?: string | null;
    flexibility?: any[];
    exercises?: any[];
  };
}): Promise<string> {
  const db = getDB();
  const id = generateId();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO clients (id, name, phone, email, goal, version, sync_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, params.name, params.phone || '', params.email || '', params.primaryGoal || params.assessment?.objectives || '', 1, 'pending', now, now]
    );

    await db.runAsync(
      `INSERT INTO client_profiles (client_id, age, gender, height_cm, initial_weight_kg, medical_notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, params.age || 0, params.gender || 'other', params.height || 0, params.initialWeight || 0, params.medicalNotes || '', now]
    );

    await db.runAsync(
      `INSERT INTO client_lifestyles (client_id, notes, updated_at) VALUES (?, ?, ?)`,
      [id, params.lifestyle?.notes || '', now]
    );

    const assessment = params.assessment;
    await db.runAsync(
      `INSERT INTO client_assessments
         (client_id, bp_systolic, bp_diastolic, resting_heart_rate,
          cardio_time_minutes, cardio_distance_km, cardio_mhr,
          objectives, flexibility_json, exercises_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, assessment?.bp_systolic ?? null, assessment?.bp_diastolic ?? null,
        assessment?.resting_heart_rate ?? null, assessment?.cardio_time_minutes ?? null,
        assessment?.cardio_distance_km ?? null, assessment?.cardio_mhr ?? null,
        assessment?.objectives ?? null, JSON.stringify(assessment?.flexibility ?? []),
        JSON.stringify(assessment?.exercises ?? []), now,
      ]
    );

    await enqueueClientUpdate(id, ['core'], db);
  });

  return id;
}

export async function updateClientProfile(clientId: string, payload: Partial<ClientProfile>) {
  const db = getDB();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await _updateProfile(db, clientId, payload, now);
    await _updateCore(db, clientId, {}, now); // Bump version
    await enqueueClientUpdate(clientId, ['core'], db);
  });
}

export async function updateClientLifestyle(clientId: string, payload: Partial<any>) {
  const db = getDB();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await _updateLifestyle(db, clientId, payload, now);
    await _updateCore(db, clientId, {}, now); // Bump version
    await enqueueClientUpdate(clientId, ['core'], db);
  });
}

export async function updateClientAssessment(clientId: string, payload: Partial<any>) {
  const db = getDB();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await _updateAssessment(db, clientId, payload, now);
    await _updateCore(db, clientId, {}, now); // Bump version
    await enqueueClientUpdate(clientId, ['core'], db);
  });
}

export async function updateClientCore(clientId: string, payload: any) {
  const db = getDB();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await _updateCore(db, clientId, payload, now);
    await enqueueClientUpdate(clientId, ['core'], db);
  });
}

export async function updateClientOverview(clientId: string, notes: string) {
  const db = getDB();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE clients SET overview_notes = ?, version = version + 1, updated_at = ? WHERE id = ?`,
      [notes, now, clientId]
    );
    await enqueueClientUpdate(clientId, ['core'], db);
  });
}

/**
 * Unified batch update for all client-related tables in one transaction.
 * Uses internal non-transactional methods to prevent SQLite contention.
 */
export async function batchUpdateClient(
  clientId: string,
  data: {
    core?: { name?: string; phone?: string; email?: string; goal?: string };
    profile?: { age?: number; gender?: Gender; height_cm?: number; initial_weight_kg?: number; medical_notes?: string };
    lifestyle?: { notes?: string };
    assessment?: {
      bp_systolic?: number | null;
      bp_diastolic?: number | null;
      resting_heart_rate?: number | null;
      cardio_time_minutes?: number | null;
      cardio_distance_km?: number | null;
      cardio_mhr?: number | null;
      objectives?: string | null;
      flexibility?: any[];
      exercises?: any[];
    };
  }
): Promise<void> {
  const db = getDB();
  const now = new Date().toISOString();

  try {
    await db.withTransactionAsync(async () => {
      if (data.profile) await _updateProfile(db, clientId, data.profile, now);
      if (data.lifestyle) await _updateLifestyle(db, clientId, data.lifestyle, now);
      if (data.assessment) await _updateAssessment(db, clientId, data.assessment, now);
      
      // Always update core last to increment version exactly once
      await _updateCore(db, clientId, data.core || {}, now);

      await enqueueClientUpdate(clientId, ['core'], db);
    });
  } catch (err) {
    console.error(`[batchUpdateClient] Transaction-level failure for client ${clientId}. Data:`, data, err);
    throw err;
  }
}

export async function getAllClients(): Promise<Client[]> {
  const db = getDB();
  return await db.getAllAsync<Client>(`SELECT * FROM clients WHERE sync_status != 'pending_delete' OR sync_status IS NULL ORDER BY name ASC`);
}

export async function getClientById(id: string): Promise<Client & { profile: ClientProfile } | null> {
  const db = getDB();
  const client = await db.getFirstAsync<Client>(`SELECT * FROM clients WHERE id = ?`, [id]);
  if (!client) return null;
  const profile = await db.getFirstAsync<ClientProfile>(`SELECT * FROM client_profiles WHERE client_id = ?`, [id]);
  return { ...client, profile: profile! };
}

export async function getDetailedClient(id: string): Promise<{
  client: Client;
  profile: ClientProfile;
  lifestyle: ClientLifestyle;
  assessment: ClientAssessment;
} | null> {
  const db = getDB();
  const client = await db.getFirstAsync<Client>(`SELECT * FROM clients WHERE id = ?`, [id]);
  if (!client) return null;

  const [profile, lifestyle, assessment] = await Promise.all([
    db.getFirstAsync<ClientProfile>(`SELECT * FROM client_profiles WHERE client_id = ?`, [id]),
    db.getFirstAsync<ClientLifestyle>(`SELECT * FROM client_lifestyles WHERE client_id = ?`, [id]),
    db.getFirstAsync<any>(`SELECT * FROM client_assessments WHERE client_id = ?`, [id]),
  ]);

  let parsedAssessment = assessment;
  if (assessment) {
    parsedAssessment = {
      ...assessment,
      exercises: assessment.exercises_json ? JSON.parse(assessment.exercises_json) : [],
      flexibility: assessment.flexibility_json ? JSON.parse(assessment.flexibility_json) : [],
    };
    delete parsedAssessment.exercises_json;
    delete parsedAssessment.flexibility_json;
  }

  return { client, profile: profile!, lifestyle: lifestyle!, assessment: parsedAssessment as ClientAssessment };
}

export async function deleteClient(clientId: string): Promise<void> {
  const db = getDB();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE clients SET sync_status = 'pending_delete', updated_at = ? WHERE id = ?`, [now, clientId]);
    
    // Explicitly enqueue delete operation using the shared transaction handle
    await db.runAsync(
      `INSERT INTO sync_queue (id, client_id, operation, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(client_id, operation) DO UPDATE SET status = 'pending', updated_at = excluded.updated_at`,
      [generateId(), clientId, 'delete', 'pending', now, now]
    );
  });
}
