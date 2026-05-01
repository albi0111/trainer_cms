import type { MeasurementCategory, MeasurementConfig } from '../types';

export interface DefaultMetricDefinition {
  key: string;
  label: string;
  unit: string;
  category: MeasurementCategory;
}

export const DEFAULT_METRICS: DefaultMetricDefinition[] = [
  { key: 'weight_kg', label: 'Weight', unit: 'kg', category: 'body' },
  { key: 'chest_cm', label: 'Chest', unit: 'cm', category: 'body' },
  { key: 'waist_cm', label: 'Waist', unit: 'cm', category: 'body' },
  { key: 'hips_cm', label: 'Hips', unit: 'cm', category: 'body' },
  { key: 'arm_cm', label: 'Arm', unit: 'cm', category: 'body' },
  { key: 'calf_cm', label: 'Calf', unit: 'cm', category: 'body' },
  { key: 'pull_strength_kg', label: 'Pull Strength', unit: 'kg', category: 'performance' },
  { key: 'push_strength_kg', label: 'Push Strength', unit: 'kg', category: 'performance' },
  { key: 'lower_body_strength_kg', label: 'Lower Body Strength', unit: 'kg', category: 'performance' },
  { key: 'cardio_endurance_min', label: 'Cardio Endurance', unit: 'min', category: 'performance' },
];

export const LOCKED_METRIC_KEYS = new Set(['weight_kg']);

export function buildDefaultMetricConfigs(clientId: string, updatedAt: string): MeasurementConfig[] {
  return DEFAULT_METRICS.map((metric) => ({
    client_id: clientId,
    key: metric.key,
    label: metric.label,
    unit: metric.unit,
    category: metric.category,
    updated_at: updatedAt,
  }));
}
