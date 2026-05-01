import { db } from '../../db/db';
import { buildDefaultMetricConfigs, DEFAULT_METRICS, LOCKED_METRIC_KEYS } from '../../constants/metrics';
import type {
  Measurement,
  MeasurementConfig,
  MeasurementEntryInput,
} from '../../types';
import { generateId } from '../../utils/id';
import { parseMeasurement, serializeMeasurementValues } from '../shared/clientSnapshotMapper';
import { nowIsoUtc } from '../shared/date';
import { enqueueClientUpdate } from '../sync/syncQueueService';
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

export function getDefaultMetrics() {
  return [...DEFAULT_METRICS];
}

export async function ensureClientMeasurementConfigs(clientId: string): Promise<MeasurementConfig[]> {
  const existing = await db.measurementConfigs.where('client_id').equals(clientId).sortBy('label');
  if (existing.length > 0) {
    return existing;
  }

  const now = nowIsoUtc();
  const seed = buildDefaultMetricConfigs(clientId, now);
  await db.measurementConfigs.bulkPut(seed);
  return db.measurementConfigs.where('client_id').equals(clientId).sortBy('label');
}

export async function getClientMeasurementConfigs(clientId: string): Promise<MeasurementConfig[]> {
  return ensureClientMeasurementConfigs(clientId);
}

export async function upsertClientMeasurementConfig(
  clientId: string,
  config: Omit<MeasurementConfig, 'client_id' | 'updated_at'>,
): Promise<void> {
  const now = nowIsoUtc();

  await db.transaction('rw', db.measurementConfigs, db.clients, db.syncQueue, async () => {
    await db.measurementConfigs.put({
      client_id: clientId,
      ...config,
      updated_at: now,
    });
    await touchClient(clientId, now);
    await enqueueClientUpdate(clientId, ['measurements']);
  });

  void scheduleBackgroundSync();
}

export async function deleteClientMeasurementConfig(clientId: string, key: string): Promise<void> {
  if (LOCKED_METRIC_KEYS.has(key)) {
    throw new Error('Weight is a required metric and cannot be removed.');
  }

  const now = nowIsoUtc();
  await db.transaction('rw', db.measurementConfigs, db.clients, db.syncQueue, async () => {
    await db.measurementConfigs.where('[client_id+key]').equals([clientId, key]).delete();
    await touchClient(clientId, now);
    await enqueueClientUpdate(clientId, ['measurements']);
  });

  void scheduleBackgroundSync();
}

export async function addMeasurement(clientId: string, input: MeasurementEntryInput): Promise<string> {
  const now = nowIsoUtc();
  const id = generateId();
  const serializedValues = serializeMeasurementValues(input.values);
  const measurement: Measurement = {
    id,
    client_id: clientId,
    date: input.date,
    weight_kg: input.values.weight_kg,
    height_cm: input.values.height_cm,
    body_fat_pct: input.values.body_fat_pct,
    chest_cm: input.values.chest_cm,
    waist_cm: input.values.waist_cm,
    hips_cm: input.values.hips_cm,
    arm_cm: input.values.arm_cm,
    thigh_cm: input.values.thigh_cm,
    neck_cm: input.values.neck_cm,
    calf_cm: input.values.calf_cm,
    pull_strength_kg: input.values.pull_strength_kg,
    push_strength_kg: input.values.push_strength_kg,
    lower_body_strength_kg: input.values.lower_body_strength_kg,
    cardio_endurance_min: input.values.cardio_endurance_min,
    custom_values_json: serializedValues,
    notes: input.notes || '',
    created_at: now,
  };

  await db.transaction('rw', db.measurements, db.clients, db.syncQueue, async () => {
    await db.measurements.put(measurement);
    await touchClient(clientId, now);
    await enqueueClientUpdate(clientId, ['measurements']);
  });

  void scheduleBackgroundSync();
  return id;
}

export async function getMeasurementsByClient(clientId: string): Promise<Measurement[]> {
  const rows = await db.measurements.where('client_id').equals(clientId).sortBy('date');
  return rows.map(parseMeasurement);
}

export async function getLatestMeasurement(clientId: string): Promise<Measurement | null> {
  const rows = await db.measurements.where('client_id').equals(clientId).sortBy('date');
  const latest = rows[rows.length - 1];
  return latest ? parseMeasurement(latest) : null;
}
