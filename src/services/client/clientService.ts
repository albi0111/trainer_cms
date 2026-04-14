// ─────────────────────────────────────────────────────────────────────────────
// Client Service — Handles all Client-related persistence
// Source of truth: resrc/system_prompt.md §2, §3, §5.3
// ─────────────────────────────────────────────────────────────────────────────

import { getDB } from '../db/database';
import { Client, ClientProfile } from '../../types';
import { generateId } from '../../utils/id';
import { enqueueClientUpdate } from '../sync/syncQueueService';

/**
 * Creates a new client and all secondary records (profile, lifestyle, assessment)
 * in a SINGLE transaction.
 * 
 * §Problem 1 Fix: Atomic creation across 4 tables.
 */
export async function createClient(name: string): Promise<string> {
  const db = getDB();
  const id = generateId();
  const now = new Date().toISOString();

  // Transaction ensures data integrity
  await db.withTransactionAsync(async () => {
    // 1. Insert core client record
    await db.runAsync(
      `INSERT INTO clients (id, name, goal, version, sync_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name, '', 1, 'pending', now, now]
    );

    // 2. Insert secondary records
    await db.runAsync(
      `INSERT INTO client_profiles (client_id, age, gender, height_cm, initial_weight_kg, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, 0, 'other', 0, 0, now]
    );

    await db.runAsync(
      `INSERT INTO client_lifestyles (client_id, updated_at) VALUES (?, ?)`,
      [id, now]
    );

    await db.runAsync(
      `INSERT INTO client_assessments (client_id, updated_at) VALUES (?, ?)`,
      [id, now]
    );

    // 3. Enqueue sync for 'core' domain (§5.3)
    await enqueueClientUpdate(id, ['core']);
  });

  return id;
}

/**
 * Updates a client's profile fields.
 * Increments version and enqueues sync for 'core'.
 */
export async function updateClientProfile(
  clientId: string,
  payload: Partial<ClientProfile>
): Promise<void> {
  const db = getDB();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    // 1. Update Profile (dynamic column building)
    const fields = Object.keys(payload).filter(k => k !== 'client_id' && k !== 'updated_at');
    if (fields.length > 0) {
      const setClause = fields.map(f => `${f} = ?`).join(', ');
      const values = fields.map(f => (payload as any)[f]);
      await db.runAsync(
        `UPDATE client_profiles SET ${setClause}, updated_at = ? WHERE client_id = ?`,
        [...values, now, clientId]
      );
    }

    // 2. Update Client (version++ and updated_at)
    await db.runAsync(
      `UPDATE clients SET version = version + 1, updated_at = ? WHERE id = ?`,
      [now, clientId]
    );

    // 3. Enqueue sync for 'core'
    await enqueueClientUpdate(clientId, ['core']);
  });
}

/**
 * Fetches all clients for the dashboard list.
 */
export async function getAllClients(): Promise<Client[]> {
  const db = getDB();
  return await db.getAllAsync<Client>(
    `SELECT * FROM clients ORDER BY name ASC`
  );
}

/**
 * Fetches full client record including profile.
 */
export async function getClientById(id: string): Promise<Client & { profile: ClientProfile } | null> {
  const db = getDB();
  const client = await db.getFirstAsync<Client>(
    `SELECT * FROM clients WHERE id = ?`,
    [id]
  );
  if (!client) return null;

  const profile = await db.getFirstAsync<ClientProfile>(
    `SELECT * FROM client_profiles WHERE client_id = ?`,
    [id]
  );

  return { ...client, profile: profile! };
}
