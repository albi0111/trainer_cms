// ─────────────────────────────────────────────────────────────────────────────
// Dexie Database — IndexedDB wrapper
// Rebuilt from reference/services/db/schema.ts (SQLite → Dexie)
//
// All reads/writes go here first. Drive sync is always async.
// IndexedDB is the single source of truth for local data.
// ─────────────────────────────────────────────────────────────────────────────

import Dexie, { type Table } from 'dexie';
import type {
  Client,
  ClientProfile,
  ClientLifestyle,
  ClientAssessment,
  Measurement,
  MeasurementConfig,
  ProgressPhoto,
  Plan,
  DietPlan,
  Session,
  SessionResult,
  Exercise,
  ClientDomainSyncState,
  SyncQueueEntry,
} from '../types';

class FitPersonaDB extends Dexie {
  // ── Table declarations ────────────────────────────────────────────────────
  clients!: Table<Client>;
  clientProfiles!: Table<ClientProfile>;
  clientLifestyles!: Table<ClientLifestyle>;
  clientAssessments!: Table<ClientAssessment>;
  measurements!: Table<Measurement>;
  measurementConfigs!: Table<MeasurementConfig>;
  progressPhotos!: Table<ProgressPhoto>;
  plans!: Table<Plan>;
  dietPlans!: Table<DietPlan>;
  sessions!: Table<Session>;
  sessionResults!: Table<SessionResult>;
  exercises!: Table<Exercise>;
  clientDomainSyncState!: Table<ClientDomainSyncState>;
  syncQueue!: Table<SyncQueueEntry>;

  constructor() {
    super('fit-persona');

    this.version(1).stores({
      // ── Primary key, then indexed fields ────────────────────────────────
      // Dexie auto-indexes the primary key.
      // Compound indexes use [field1+field2] syntax.
      // Only list fields you need to query/filter by.

      clients: 'id, sync_status, created_at',
      clientProfiles: 'client_id',
      clientLifestyles: 'client_id',
      clientAssessments: 'client_id',
      measurements: 'id, client_id, date, [client_id+date]',
      measurementConfigs: '[client_id+key], client_id, category',
      progressPhotos: 'id, client_id, date, [client_id+date]',
      plans: 'id, client_id, type, [client_id+type]',
      dietPlans: 'id, client_id',
      sessions: 'id, client_id, date, plan_id, [client_id+date], [client_id+status]',
      sessionResults: 'session_id',
      exercises: 'id, session_id',
      clientDomainSyncState: '[client_id+domain], client_id',
      syncQueue: 'id, [client_id+operation], status',
    });
  }
}

/** Singleton DB instance — import this everywhere. */
export const db = new FitPersonaDB();
