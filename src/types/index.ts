// ─────────────────────────────────────────────────────────────────────────────
// fit.persona — Type Definitions (PWA)
// Cleaned from reference/types/index.ts — NO Expo/RN imports
// ─────────────────────────────────────────────────────────────────────────────

// ── Client ───────────────────────────────────────────────────────────────────

/** status is DERIVED — never manually set. See deriveClientStatus(). */
export type ClientStatus = 'active' | 'inactive' | 'completed';

export type SyncStatus = 'synced' | 'pending' | 'pending_delete';

export interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  goal: string;
  overview_notes?: string;
  /** DERIVED — never stored. Computed on every read. */
  status: ClientStatus;
  /** Increments on every write. Used for conflict resolution. */
  version: number;
  sync_status: SyncStatus;
  created_at: string;       // ISO 8601
  updated_at: string;       // ISO 8601
}

// ── ClientProfile ────────────────────────────────────────────────────────────

export type Gender = 'male' | 'female' | 'other';

export interface ClientProfile {
  client_id: string;
  age: number;
  gender: Gender;
  height_cm: number;
  initial_weight_kg: number;
  medical_notes?: string;
  medications?: string;
  /** Base64 data URI or blob URL — NOT a filesystem path */
  photo_uri?: string;
  updated_at: string;
}

// ── Measurement (append-only time-series) ────────────────────────────────────

export interface Measurement {
  id: string;
  client_id: string;
  date: string;             // ISO 8601 date only
  weight_kg?: number;
  height_cm?: number;
  body_fat_pct?: number;
  chest_cm?: number;
  waist_cm?: number;
  hips_cm?: number;
  arm_cm?: number;
  thigh_cm?: number;
  neck_cm?: number;
  calf_cm?: number;
  pull_strength_kg?: number;
  push_strength_kg?: number;
  lower_body_strength_kg?: number;
  cardio_endurance_min?: number;
  /** JSON-encoded values for dynamic fields */
  custom_values_json?: string;
  /** Parsed local-only helper for dynamic fields */
  values?: Record<string, number | undefined>;
  notes?: string;
  created_at: string;
}

export type MeasurementCategory = 'body' | 'performance';

export interface MeasurementConfig {
  client_id: string;
  key: string;
  label: string;
  unit?: string;
  category: MeasurementCategory;
  target_min?: number;
  target_max?: number;
  updated_at: string;
}

// ── Plan ─────────────────────────────────────────────────────────────────────

export type PlanType = 'monthly' | 'weekly';

export type PlanStatus = 'upcoming' | 'active' | 'completed';

export interface Plan {
  id: string;
  client_id: string;
  type: PlanType;
  title: string;
  goal: string;
  start_date: string;
  end_date: string;
  parent_plan_id: string | null;
  order_index: number | null;
  status: PlanStatus;
  created_at: string;
  updated_at: string;
}

// ── Session (append-only) ────────────────────────────────────────────────────

export type SessionType = 'strength' | 'cardio' | 'mobility' | 'mixed';

export type SessionStatus = 'planned' | 'completed' | 'missed';

export type MissedReason = 'sick' | 'travel' | 'busy' | 'no_show' | 'other';

export interface Session {
  id: string;
  plan_id: string | null;
  client_id: string;
  date: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  day_name: string;
  focus: string;
  type: SessionType;
  status: SessionStatus;
  missed_reason?: MissedReason;
  missed_note?: string;
  postponed_note?: string;
  original_date?: string;
  notes?: string;
  measure_reminder?: boolean;
  created_at: string;
  updated_at: string;
}

// ── SessionResult ────────────────────────────────────────────────────────────

export interface SessionResult {
  session_id: string;
  perceived_difficulty: number;
  energy_level: number;
  performance_notes?: string;
  trainer_notes?: string;
  completed_at: string;
}

// ── Exercise ─────────────────────────────────────────────────────────────────

export interface ExerciseSet {
  weight_kg?: number;
  reps: number;
  rpe?: number;
}

export interface Exercise {
  id: string;
  session_id: string;
  name: string;
  order_index: number;
  target_sets?: number;
  target_reps?: string;
  notes?: string;
  sets: ExerciseSet[];
  progression_note?: string;
  created_at: string;
}

// ── ClientLifestyle ──────────────────────────────────────────────────────────

export type StressLevel = 'low' | 'medium' | 'high';
export type ActivityLevel = 'sedentary' | 'moderate' | 'active';
export type DietType = 'veg' | 'non-veg' | 'mixed';

export interface ClientLifestyle {
  client_id: string;
  sleep_hours_avg?: number;
  stress_level?: StressLevel;
  activity_level?: ActivityLevel;
  diet_type?: DietType;
  water_intake_liters?: number;
  smoking?: boolean;
  alcohol?: boolean;
  job_type?: string;
  notes?: string;
  updated_at: string;
}

// ── ClientAssessment ─────────────────────────────────────────────────────────

export type AssessmentExerciseKey =
  | 'bench_press'
  | 'squat'
  | 'leg_press'
  | 'lat_pulldown'
  | 'seated_row'
  | 'leg_curl'
  | 'cardio'
  | 'other';

export interface AssessmentExercise {
  key: AssessmentExerciseKey;
  order_index: number;
  note?: string;
}

export type FlexibilityKey =
  | 'hamstrings'
  | 'quadriceps'
  | 'seated_toe_reach'
  | 'shoulders'
  | 'trunk_rotation'
  | 'hip_flexors';

export interface FlexibilityResult {
  key: FlexibilityKey;
  right?: boolean;
  left?: boolean;
  note?: string;
}

export interface ClientAssessment {
  client_id: string;
  assessed_at?: string;
  bp_systolic?: number;
  bp_diastolic?: number;
  resting_heart_rate?: number;
  vitals_remarks?: string;
  exercises: AssessmentExercise[];
  cardio_time_minutes?: number;
  cardio_distance_km?: number;
  cardio_mhr?: number;
  flexibility: FlexibilityResult[];
  objectives?: string;
  updated_at: string;
}

// ── DietPlan ─────────────────────────────────────────────────────────────────

export interface DietMeal {
  name: string;
  foods: string;
}

export interface DietPlan {
  id: string;
  client_id: string;
  title: string;
  goal: string;
  start_date?: string;
  end_date?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fats_g?: number;
  water_liters?: number;
  meals?: DietMeal[];
  meal_notes?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ── ProgressPhoto ────────────────────────────────────────────────────────────

export type PhotoType = 'front' | 'side' | 'back';

export type UploadStatus = 'local' | 'uploaded' | 'failed';

export interface ProgressPhoto {
  id: string;
  client_id: string;
  /** Blob URL or base64 data URI — NOT a filesystem path */
  uri: string;
  date: string;
  type?: PhotoType;
  note?: string;
  file_size_bytes?: number;
  drive_file_id?: string;
  upload_status: UploadStatus;
  created_at: string;
}

// ── Sync Domain ──────────────────────────────────────────────────────────────

export type SyncDomain =
  | 'core'
  | 'measurements'
  | 'progress_photos'
  | 'plans'
  | 'diet_plans'
  | 'sessions'
  | 'session_results'
  | 'exercises';

export interface ClientDomainSyncState {
  client_id: string;
  domain: SyncDomain;
  updated_at: string;
}

export type SyncQueueOperation = 'update' | 'delete';

export type SyncQueueStatus = 'pending' | 'processing' | 'failed';

export interface SyncQueueEntry {
  id: string;
  client_id: string;
  operation: SyncQueueOperation;
  affected_domains: SyncDomain[];
  status: SyncQueueStatus;
  retry_count: number;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
}
