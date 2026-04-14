// ─────────────────────────────────────────────────────────────────────────────
// Trainer CMS — Type Definitions
// Source of truth: resrc/system_prompt.md §2
// ─────────────────────────────────────────────────────────────────────────────

// ── §2.1 Client ──────────────────────────────────────────────────────────────

/** status is DERIVED — never manually set. See §2.12 for derivation logic. */
export type ClientStatus = 'active' | 'inactive' | 'completed';

export type SyncStatus = 'synced' | 'pending' | 'pending_delete';

export interface Client {
  id: string;               // uuid, stable forever
  name: string;
  phone?: string;
  email?: string;
  goal: string;
  /** DERIVED — never stored. Computed on every read per §2.12. */
  status: ClientStatus;
  /** Increments on every write. Used for multi-device conflict resolution. */
  version: number;
  sync_status: SyncStatus;
  created_at: string;       // ISO 8601
  updated_at: string;       // ISO 8601
}

// ── §2.2 ClientProfile ───────────────────────────────────────────────────────

export type Gender = 'male' | 'female' | 'other';

export interface ClientProfile {
  client_id: string;        // FK → Client.id
  age: number;
  gender: Gender;
  height_cm: number;
  initial_weight_kg: number;
  medical_notes?: string;
  photo_uri?: string;       // local path, NOT a Drive URL
  updated_at: string;
}

// ── §2.3 Measurement (append-only time-series) ───────────────────────────────

export interface Measurement {
  id: string;
  client_id: string;        // FK → Client.id
  date: string;             // ISO 8601 date only
  weight_kg: number;
  body_fat_pct?: number;
  chest_cm?: number;
  waist_cm?: number;
  hips_cm?: number;
  notes?: string;
  created_at: string;
}

// ── §2.4 Plan ────────────────────────────────────────────────────────────────

export type PlanType = 'monthly' | 'weekly';

export type PlanStatus = 'upcoming' | 'active' | 'completed';

export interface Plan {
  id: string;
  client_id: string;
  type: PlanType;
  title: string;
  goal: string;
  start_date: string;             // ISO 8601
  end_date: string;
  /** null = standalone weekly OR monthly root */
  parent_plan_id: string | null;
  /** position within monthly (1-indexed). null for monthly roots. */
  order_index: number | null;
  status: PlanStatus;
  created_at: string;
  updated_at: string;
}

// ── §2.5 Session (append-only) ───────────────────────────────────────────────

export type SessionType = 'strength' | 'cardio' | 'mobility' | 'mixed';

export type SessionStatus = 'planned' | 'completed' | 'missed';

export type MissedReason = 'sick' | 'travel' | 'busy' | 'no_show' | 'other';

export interface Session {
  id: string;
  /** FK → Plan.id (weekly only). Nullable for manual sessions. */
  plan_id: string | null;
  client_id: string;              // FK → Client.id (denormalized for fast queries)
  date: string;                   // ISO 8601 date only
  day_name: string;               // e.g., "Monday"
  focus: string;                  // e.g., "Upper Body"
  type: SessionType;
  status: SessionStatus;
  /** Only set when status = 'missed' */
  missed_reason?: MissedReason;
  /** Free-text only when missed_reason = 'other' */
  missed_note?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ── §2.6 SessionResult ───────────────────────────────────────────────────────

export interface SessionResult {
  session_id: string;             // FK → Session.id, 1:1
  /** Scale 1–10 */
  perceived_difficulty: number;
  /** Scale 1–10 */
  energy_level: number;
  performance_notes?: string;    // trainer observation of client
  trainer_notes?: string;        // internal trainer notes
  completed_at: string;          // ISO 8601 datetime
}

// ── §2.7 Exercise ────────────────────────────────────────────────────────────

export interface ExerciseSet {
  weight_kg?: number;
  reps: number;
  /** Rate of Perceived Exertion 1–10 */
  rpe?: number;
}

export interface Exercise {
  id: string;
  session_id: string;            // FK → Session.id
  name: string;
  order_index: number;           // display order within session
  /** Stored as JSON in SQLite */
  sets: ExerciseSet[];
  progression_note?: string;
  created_at: string;
}

// ── §2.8 ClientLifestyle ─────────────────────────────────────────────────────

export type StressLevel = 'low' | 'medium' | 'high';
export type ActivityLevel = 'sedentary' | 'moderate' | 'active';
export type DietType = 'veg' | 'non-veg' | 'mixed';

export interface ClientLifestyle {
  client_id: string;             // FK → Client.id, 1:1
  sleep_hours_avg?: number;
  stress_level?: StressLevel;
  activity_level?: ActivityLevel;
  diet_type?: DietType;
  water_intake_liters?: number;
  smoking?: boolean;
  alcohol?: boolean;
  job_type?: string;             // e.g., "desk job", "field work"
  notes?: string;
  updated_at: string;
}

// ── §2.9 ClientAssessment ────────────────────────────────────────────────────

export type AssessmentExerciseKey =
  | 'bench_press'    // Pictogram 1 — lying horizontal push
  | 'squat'          // Pictogram 2 — squat position
  | 'leg_press'      // Pictogram 3 — seated/knee-bent exercise
  | 'lat_pulldown'   // Pictogram 4 — hanging / pull movement
  | 'seated_row'     // Pictogram 5 — seated rowing/press
  | 'leg_curl';      // Pictogram 6 — lying face-down leg exercise
  // Pictogram 7 = cardio → stored in cardio_* fields

export interface AssessmentExercise {
  key: AssessmentExerciseKey;
  order_index: number;           // Display order (1–6)
  note?: string;                 // Trainer's observation / remarks
}

export type FlexibilityKey =
  | 'hamstrings'        // Test 1 — R + L
  | 'quadriceps'        // Test 2 — R + L
  | 'seated_toe_reach'  // Test 3 — bilateral (single check)
  | 'shoulders'         // Test 4 — R + L
  | 'trunk_rotation'    // Test 5 — R + L
  | 'hip_flexors';      // Test 6 — R + L

export interface FlexibilityResult {
  key: FlexibilityKey;
  right?: boolean;               // R checkbox (null for bilateral tests)
  left?: boolean;                // L checkbox (null for bilateral tests)
  note?: string;
}

export interface ClientAssessment {
  client_id: string;             // FK → Client.id, 1:1
  assessed_at?: string;          // ISO 8601 date

  // Section 1: Vitals
  bp_systolic?: number;          // mmHg
  bp_diastolic?: number;         // mmHg
  resting_heart_rate?: number;   // bpm
  vitals_remarks?: string;

  // Section 2: Strength exercises (6 fixed, stored as JSON in DB)
  exercises: AssessmentExercise[];

  // Section 3: Cardio (7th pictogram)
  cardio_time_minutes?: number;
  cardio_distance_km?: number;
  cardio_mhr?: number;           // Maximum Heart Rate in bpm

  // Section 4: Flexibility (6 fixed tests, stored as JSON in DB)
  flexibility: FlexibilityResult[];

  // Section 5: Objectives
  objectives?: string;

  updated_at: string;
}

// ── §2.10 DietPlan ───────────────────────────────────────────────────────────

export interface DietPlan {
  id: string;
  client_id: string;             // FK → Client.id
  title: string;
  goal: string;
  start_date?: string;
  end_date?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fats_g?: number;
  water_liters?: number;
  meal_notes?: string;           // general meal guidance
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ── §2.11 ProgressPhoto ──────────────────────────────────────────────────────

export type PhotoType = 'front' | 'side' | 'back';

export type UploadStatus = 'local' | 'uploaded' | 'failed';

export interface ProgressPhoto {
  id: string;
  client_id: string;             // FK → Client.id
  /** Local filesystem path — NEVER a Drive URL */
  uri: string;
  date: string;                  // ISO 8601 date only
  type?: PhotoType;
  note?: string;
  file_size_bytes?: number;
  /** Populated only after successful Drive upload */
  drive_file_id?: string;
  upload_status: UploadStatus;
  created_at: string;
}

// ── Sync Domain ──────────────────────────────────────────────────────────────

/**
 * All valid sync domains — matches the CHECK constraint in client_domain_sync_state.
 * Names are hardcoded constants — they map 1:1 to Drive file names.
 */
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
  updated_at: string;            // ISO 8601 — epoch default on first row
}

export type SyncQueueOperation = 'update' | 'delete';

export type SyncQueueStatus = 'pending' | 'processing' | 'failed';

export interface SyncQueueEntry {
  id: string;
  client_id: string;             // FK → Client.id
  operation: SyncQueueOperation;
  /** JSON-encoded array of SyncDomain values */
  affected_domains: SyncDomain[];
  status: SyncQueueStatus;
  retry_count: number;
  /** null = immediate retry; ISO 8601 otherwise */
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
}
