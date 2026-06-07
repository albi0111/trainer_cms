import { db, withDatabaseRecovery } from '../../db/db';
import { EMPTY_ASSESSMENT, EMPTY_LIFESTYLE, EMPTY_PROFILE } from '../../constants/assessment';
import { buildDefaultMetricConfigs } from '../../constants/metrics';
import type {
  Client,
  ClientDetail,
  ClientProfile,
  CreateClientInput,
  UpdateClientInput,
} from '../../types';
import { generateId } from '../../utils/id';
import { normalizeAssessment, normalizeGender } from '../shared/assessmentMapper';
import { buildClientDetail } from '../shared/clientSnapshotMapper';
import { nowIsoUtc } from '../shared/date';
import { normalizeOptionalContactValue, validateOptionalClientContact } from '../shared/inputValidation';
import { enqueueClientDelete, enqueueClientUpdate } from '../sync/syncQueueService';
import { scheduleBackgroundSync } from '../sync/syncService';

async function touchClient(clientId: string, now: string): Promise<void> {
  await db.clients.update(clientId, (client) => {
    if (!client) {
      return;
    }
    client.version += 1;
    client.updated_at = now;
    if (client.sync_status !== 'pending_delete') {
      client.sync_status = 'pending';
    }
  });
}

async function enqueueClientUpdateSafely(clientId: string, domains: ['core']): Promise<void> {
  try {
    await enqueueClientUpdate(clientId, domains);
  } catch (error) {
    console.error('Failed to enqueue client update', error);
  }
}

async function enqueueClientDeleteSafely(clientId: string): Promise<void> {
  try {
    await enqueueClientDelete(clientId);
  } catch (error) {
    console.error('Failed to enqueue client delete', error);
  }
}

async function seedDefaultMeasurementConfigs(clientId: string, now: string): Promise<void> {
  try {
    await db.measurementConfigs.bulkPut(buildDefaultMetricConfigs(clientId, now));
  } catch (error) {
    console.error('Failed to seed default measurement configs', error);
  }
}

function buildClientRecord(id: string, input: CreateClientInput, now: string): Client {
  return {
    id,
    name: input.name.trim(),
    phone: normalizeOptionalContactValue(input.phone),
    email: normalizeOptionalContactValue(input.email),
    goal: input.goal?.trim() || input.assessment?.objectives?.trim() || '',
    overview_notes: '',
    version: 1,
    sync_status: 'pending',
    created_at: now,
    updated_at: now,
  };
}

async function persistNewClientCoreRecords(
  client: Client,
  profile: ClientProfile,
  lifestyle: ReturnType<typeof buildNewLifestyleRecord>,
  assessment: ReturnType<typeof normalizeAssessment>,
): Promise<void> {
  await db.clients.add(client);

  try {
    await db.clientProfiles.put(profile);
  } catch (error) {
    console.error('Failed to persist client profile', error);
  }

  try {
    await db.clientLifestyles.put(lifestyle);
  } catch (error) {
    console.error('Failed to persist client lifestyle', error);
  }

  if (assessment) {
    try {
      await db.clientAssessments.put(assessment);
    } catch (error) {
      console.error('Failed to persist client assessment', error);
    }
  }
}

function buildNewLifestyleRecord(id: string, input: CreateClientInput, now: string) {
  return {
    client_id: id,
    ...EMPTY_LIFESTYLE,
    ...input.lifestyle,
    updated_at: now,
  };
}

async function applyClientUpdateRecords(
  clientId: string,
  input: UpdateClientInput,
  now: string,
): Promise<void> {
  if (input.core) {
    validateOptionalClientContact({
      phone: input.core.phone,
      email: input.core.email,
    });
    await db.clients.update(clientId, (client) => {
      if (!client) {
        return;
      }
      if (typeof input.core?.name === 'string') {
        client.name = input.core.name.trim();
      }
      if (typeof input.core?.phone === 'string') {
        client.phone = normalizeOptionalContactValue(input.core.phone);
      }
      if (typeof input.core?.email === 'string') {
        client.email = normalizeOptionalContactValue(input.core.email);
      }
      if (typeof input.core?.goal === 'string') {
        client.goal = input.core.goal.trim();
      }
      if (typeof input.core?.overview_notes === 'string') {
        client.overview_notes = input.core.overview_notes;
      }
    });
  }

  if (input.profile) {
    try {
      const existing = await db.clientProfiles.get(clientId);
      await db.clientProfiles.put({
        client_id: clientId,
        ...EMPTY_PROFILE,
        ...existing,
        ...input.profile,
        gender: normalizeGender((input.profile.gender as string | undefined) || existing?.gender),
        updated_at: now,
      });
    } catch (error) {
      console.error('Failed to update client profile', error);
    }
  }

  if (input.lifestyle) {
    try {
      const existing = await db.clientLifestyles.get(clientId);
      await db.clientLifestyles.put({
        client_id: clientId,
        ...EMPTY_LIFESTYLE,
        ...existing,
        ...input.lifestyle,
        updated_at: now,
      });
    } catch (error) {
      console.error('Failed to update client lifestyle', error);
    }
  }

  if (input.assessment) {
    try {
      const existing = await db.clientAssessments.get(clientId);
      const normalized = normalizeAssessment({
        client_id: clientId,
        ...EMPTY_ASSESSMENT,
        ...existing,
        ...input.assessment,
        updated_at: now,
      });
      if (normalized) {
        await db.clientAssessments.put(normalized);
      }
    } catch (error) {
      console.error('Failed to update client assessment', error);
    }
  }

  await touchClient(clientId, now);
}

export async function createClient(input: CreateClientInput): Promise<string> {
  return withDatabaseRecovery(async () => {
    validateOptionalClientContact(input);
    const id = generateId();
    const now = nowIsoUtc();
    const client = buildClientRecord(id, input, now);
    const profile: ClientProfile = {
      client_id: id,
      ...EMPTY_PROFILE,
      ...input.profile,
      gender: normalizeGender(input.profile?.gender),
      updated_at: now,
    };
    const lifestyle = buildNewLifestyleRecord(id, input, now);
    const assessment = normalizeAssessment({
      client_id: id,
      ...EMPTY_ASSESSMENT,
      ...input.assessment,
      updated_at: now,
    });

    await persistNewClientCoreRecords(client, profile, lifestyle, assessment);
    await seedDefaultMeasurementConfigs(id, now);
    await enqueueClientUpdateSafely(id, ['core']);
    void scheduleBackgroundSync();
    return id;
  });
}

export async function getClients(): Promise<Client[]> {
  return withDatabaseRecovery(async () => {
    const clients = await db.clients
      .where('sync_status')
      .notEqual('pending_delete')
      .sortBy('name');
    return clients.filter((client) => !client.archived_at);
  });
}

export async function getArchivedClients(): Promise<Client[]> {
  return withDatabaseRecovery(async () => {
    const clients = await db.clients
      .where('sync_status')
      .notEqual('pending_delete')
      .sortBy('name');
    return clients.filter((client) => Boolean(client.archived_at));
  });
}

export async function getClientById(clientId: string): Promise<Client | null> {
  return withDatabaseRecovery(async () => {
    const client = await db.clients.get(clientId);
    if (!client || client.sync_status === 'pending_delete') {
      return null;
    }
    return client;
  });
}

export async function getClientDetail(clientId: string): Promise<ClientDetail | null> {
  return withDatabaseRecovery(async () => {
    const detail = await buildClientDetail(clientId);
    if (!detail || detail.client.sync_status === 'pending_delete') {
      return null;
    }
    return detail;
  });
}

export async function updateClient(clientId: string, input: UpdateClientInput): Promise<void> {
  await withDatabaseRecovery(async () => {
    const now = nowIsoUtc();
    await applyClientUpdateRecords(clientId, input, now);
    await enqueueClientUpdateSafely(clientId, ['core']);
    void scheduleBackgroundSync();
  });
}

export async function updateClientOverview(clientId: string, notes: string): Promise<void> {
  await updateClient(clientId, {
    core: {
      overview_notes: notes,
    },
  });
}

export async function archiveClient(clientId: string): Promise<void> {
  await withDatabaseRecovery(async () => {
    const now = nowIsoUtc();
    await db.clients.update(clientId, (client) => {
      if (!client || client.sync_status === 'pending_delete') {
        return;
      }
      client.archived_at = now;
      client.version += 1;
      client.updated_at = now;
      client.sync_status = 'pending';
    });
    await enqueueClientUpdateSafely(clientId, ['core']);
    void scheduleBackgroundSync();
  });
}

export async function unarchiveClient(clientId: string): Promise<void> {
  await withDatabaseRecovery(async () => {
    const now = nowIsoUtc();
    await db.clients.update(clientId, (client) => {
      if (!client || client.sync_status === 'pending_delete') {
        return;
      }
      delete client.archived_at;
      client.version += 1;
      client.updated_at = now;
      client.sync_status = 'pending';
    });
    await enqueueClientUpdateSafely(clientId, ['core']);
    void scheduleBackgroundSync();
  });
}

export async function deleteClient(clientId: string): Promise<void> {
  await withDatabaseRecovery(async () => {
    const now = nowIsoUtc();

    try {
      await db.transaction('rw', db.clients, async () => {
        await db.clients.update(clientId, (client) => {
          if (!client) {
            return;
          }
          client.sync_status = 'pending_delete';
          client.version += 1;
          client.updated_at = now;
        });
      });
    } catch (error) {
      console.error('Client delete transaction failed, retrying sequentially', error);
      await db.clients.update(clientId, (client) => {
        if (!client) {
          return;
        }
        client.sync_status = 'pending_delete';
        client.version += 1;
        client.updated_at = now;
      });
    }

    await enqueueClientDeleteSafely(clientId);
    void scheduleBackgroundSync();
  });
}
