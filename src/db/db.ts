import Dexie, { type Table } from 'dexie';
import type {
  Client,
  ClientAssessment,
  ClientLifestyle,
  ClientProfile,
  ClientSyncState,
  DietPlan,
  Exercise,
  LocalSyncMeta,
  Measurement,
  MeasurementConfig,
  Plan,
  ProgressPhoto,
  Session,
  SessionResult,
  SyncQueueEntry,
} from '../types';

class FitPersonaDB extends Dexie {
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
  syncQueue!: Table<SyncQueueEntry>;
  syncMeta!: Table<LocalSyncMeta>;
  clientSyncState!: Table<ClientSyncState>;

  constructor() {
    super('fit-persona');

    this.version(1).stores({
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

    this.version(2)
      .stores({
        clients: 'id, sync_status, updated_at, created_at',
        clientProfiles: 'client_id',
        clientLifestyles: 'client_id',
        clientAssessments: 'client_id',
        measurements: 'id, client_id, date, [client_id+date]',
        measurementConfigs: '[client_id+key], client_id, key, category',
        progressPhotos: 'id, client_id, date, [client_id+date]',
        plans: 'id, client_id, type, status, parent_plan_id, [client_id+type], [parent_plan_id+order_index]',
        dietPlans: 'id, client_id',
        sessions: 'id, client_id, plan_id, status, date, [client_id+date], [client_id+status], [status+date], [plan_id+date]',
        sessionResults: 'session_id',
        exercises: 'id, session_id, [session_id+order_index]',
        syncQueue: 'id, [client_id+operation], status',
        syncMeta: 'id',
        clientSyncState: 'client_id, remote_updated_at, remote_version, last_synced_at',
      })
      .upgrade(async (transaction) => {
        await transaction.table('clients').toCollection().modify((client: Record<string, unknown>) => {
          delete client.status;
          if (!client.updated_at && client.created_at) {
            client.updated_at = client.created_at;
          }
        });

        await transaction.table('clientAssessments').toCollection().modify((assessment: Record<string, unknown>) => {
          const flexibility = Array.isArray(assessment.flexibility) ? assessment.flexibility : [];
          assessment.flexibility = flexibility.map((item) => {
            if (!item || typeof item !== 'object') {
              return item;
            }

            const castItem = item as Record<string, unknown>;
            return {
              ...castItem,
              right: typeof castItem.right === 'boolean' ? castItem.right : Boolean(castItem.r),
              left: typeof castItem.left === 'boolean' ? castItem.left : Boolean(castItem.l),
              pass: typeof castItem.pass === 'boolean' ? castItem.pass : undefined,
            };
          });
        });

        await transaction.table('sessions').toCollection().modify((session: Record<string, unknown>) => {
          if (typeof session.measure_reminder !== 'boolean') {
            session.measure_reminder = Boolean(session.measure_reminder);
          }
        });

        await transaction.table('syncMeta').put({ id: 'default' } as LocalSyncMeta);
      });

    this.version(3)
      .stores({
        clients: 'id, sync_status, updated_at, created_at',
        clientProfiles: 'client_id',
        clientLifestyles: 'client_id',
        clientAssessments: 'client_id',
        measurements: 'id, client_id, date, [client_id+date]',
        measurementConfigs: '[client_id+key], client_id, key, category',
        progressPhotos: 'id, client_id, date, [client_id+date]',
        plans: 'id, client_id, type, status, parent_plan_id, [client_id+type], [parent_plan_id+order_index]',
        dietPlans: 'id, client_id',
        sessions: 'id, client_id, plan_id, status, date, [client_id+date], [client_id+status], [status+date], [plan_id+date]',
        sessionResults: 'session_id',
        exercises: 'id, session_id, [session_id+order_index]',
        syncQueue: 'id, [client_id+operation], status',
        syncMeta: 'id',
        clientSyncState: 'client_id, remote_updated_at, remote_version, last_synced_at',
      })
      .upgrade(async (transaction) => {
        const syncQueueTable = transaction.table('syncQueue');
        const queueEntries = await syncQueueTable.toArray() as SyncQueueEntry[];
        const mergedQueueEntries = new Map<string, SyncQueueEntry>();

        for (const entry of queueEntries) {
          const mergeKey = `${entry.client_id}:${entry.operation}`;
          const existing = mergedQueueEntries.get(mergeKey);

          if (!existing) {
            mergedQueueEntries.set(mergeKey, entry);
            continue;
          }

          mergedQueueEntries.set(mergeKey, {
            ...existing,
            affected_domains: Array.from(new Set([
              ...existing.affected_domains,
              ...entry.affected_domains,
            ])),
            retry_count: Math.max(existing.retry_count, entry.retry_count),
            next_retry_at: existing.next_retry_at && entry.next_retry_at
              ? (existing.next_retry_at > entry.next_retry_at ? existing.next_retry_at : entry.next_retry_at)
              : existing.next_retry_at || entry.next_retry_at,
            updated_at: existing.updated_at > entry.updated_at ? existing.updated_at : entry.updated_at,
          });
        }

        await syncQueueTable.clear();
        if (mergedQueueEntries.size > 0) {
          await syncQueueTable.bulkPut(Array.from(mergedQueueEntries.values()));
        }
      });

    this.version(4)
      .stores({
        clients: 'id, sync_status, updated_at, created_at',
        clientProfiles: 'client_id',
        clientLifestyles: 'client_id',
        clientAssessments: 'client_id',
        measurements: 'id, client_id, date, [client_id+date]',
        measurementConfigs: '[client_id+key], client_id, key, category',
        progressPhotos: 'id, client_id, date, [client_id+date]',
        plans: 'id, client_id, type, status, parent_plan_id, [client_id+type], [parent_plan_id+order_index]',
        dietPlans: 'id, client_id',
        sessions: 'id, client_id, plan_id, status, date, [client_id+date], [client_id+status], [status+date], [plan_id+date]',
        sessionResults: 'session_id',
        exercises: 'id, session_id, [session_id+order_index]',
        syncQueue: 'id, [client_id+operation], status, updated_at',
        syncMeta: 'id',
        clientSyncState: 'client_id, remote_updated_at, remote_version, last_synced_at',
      });

    this.version(5)
      .stores({
        clients: 'id, sync_status, updated_at, created_at',
        clientProfiles: 'client_id',
        clientLifestyles: 'client_id',
        clientAssessments: 'client_id',
        measurements: 'id, client_id, date, [client_id+date]',
        measurementConfigs: '[client_id+key], client_id, key, category',
        progressPhotos: 'id, client_id, date, [client_id+date]',
        plans: 'id, client_id, type, status, parent_plan_id, [client_id+type], [parent_plan_id+order_index]',
        dietPlans: 'id, client_id',
        sessions: 'id, client_id, plan_id, status, date, [client_id+date], [client_id+status], [status+date], [plan_id+date]',
        sessionResults: 'session_id',
        exercises: 'id, session_id, [session_id+order_index]',
        syncQueue: 'id, [client_id+operation], status, updated_at',
        syncMeta: 'id',
        clientSyncState: 'client_id, remote_updated_at, remote_version, last_synced_at',
      })
      .upgrade(async (transaction) => {
        await transaction.table('syncMeta').put({ id: 'default' } as LocalSyncMeta);
      });
  }
}

export const db = new FitPersonaDB();

let recoveryPromise: Promise<void> | null = null;

function isRecoverableDatabaseError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === 'DatabaseClosedError'
    || error.name === 'InvalidStateError'
    || error.message.includes('Backend aborted error')
    || error.message.includes('DatabaseClosedError')
    || error.message.includes('InvalidStateError')
  );
}

async function resetDatabase(): Promise<void> {
  db.close();
  await db.delete();
  await db.open();
}

export async function ensureDatabaseReady(): Promise<void> {
  if (db.isOpen()) {
    return;
  }

  try {
    await db.open();
  } catch (error) {
    if (!isRecoverableDatabaseError(error)) {
      throw error;
    }

    if (!recoveryPromise) {
      recoveryPromise = (async () => {
        console.error('Recovering corrupted IndexedDB database', error);
        await resetDatabase();
      })().finally(() => {
        recoveryPromise = null;
      });
    }

    await recoveryPromise;
  }
}

export async function withDatabaseRecovery<T>(operation: () => Promise<T>): Promise<T> {
  await ensureDatabaseReady();

  try {
    return await operation();
  } catch (error) {
    if (!isRecoverableDatabaseError(error)) {
      throw error;
    }

    if (!recoveryPromise) {
      recoveryPromise = (async () => {
        console.error('Recovering IndexedDB after runtime failure', error);
        await resetDatabase();
      })().finally(() => {
        recoveryPromise = null;
      });
    }

    await recoveryPromise;
    return operation();
  }
}
