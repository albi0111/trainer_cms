export type ClientStatus = 'active' | 'inactive' | 'completed';

export type SyncStatus = 'synced' | 'pending' | 'pending_delete';

export interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  goal: string;
  overview_notes?: string;
  version: number;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export type Gender = 'male' | 'female' | 'other';

export interface ClientProfile {
  client_id: string;
  age: number;
  gender: Gender;
  height_cm: number;
  initial_weight_kg: number;
  medical_notes?: string;
  medications?: string;
  photo_uri?: string;
  updated_at: string;
}

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

export type AssessmentExerciseKey =
  | 'exersise_1'
  | 'exersise_2'
  | 'exersise_3'
  | 'exersise_4'
  | 'exersise_5'
  | 'exersise_6'
  | 'exersise_7'
  | 'exersise_8';

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
  label?: string;
  right?: boolean;
  left?: boolean;
  pass?: boolean;
  note?: string;
}

export interface ClientAssessment {
  client_id: string;
  assessed_at?: string;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  resting_heart_rate?: number | null;
  vitals_remarks?: string;
  exercises: AssessmentExercise[];
  cardio_time_minutes?: number | null;
  cardio_distance_km?: number | null;
  cardio_mhr?: number | null;
  flexibility: FlexibilityResult[];
  objectives?: string;
  updated_at: string;
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

export type MeasurementValueMap = Record<string, number | undefined>;

export interface Measurement {
  id: string;
  client_id: string;
  date: string;
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
  custom_values_json?: string;
  values?: MeasurementValueMap;
  notes?: string;
  created_at: string;
}

export interface MeasurementEntryInput {
  date: string;
  values: MeasurementValueMap;
  notes?: string;
}

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

export interface SessionResult {
  session_id: string;
  perceived_difficulty: number;
  energy_level: number;
  performance_notes?: string;
  trainer_notes?: string;
  completed_at: string;
}

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

export type PhotoType = 'front' | 'side' | 'back';
export type UploadStatus = 'local' | 'uploaded' | 'failed';

export interface ProgressPhoto {
  id: string;
  client_id: string;
  uri: string;
  date: string;
  type?: PhotoType;
  note?: string;
  file_size_bytes?: number;
  drive_file_id?: string;
  upload_status: UploadStatus;
  created_at: string;
}

export type SyncDomain =
  | 'core'
  | 'measurements'
  | 'progress_photos'
  | 'plans'
  | 'diet_plans'
  | 'sessions'
  | 'session_results'
  | 'exercises';

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

export interface LocalSyncMeta {
  id: 'default';
  remote_meta_updated_at?: string;
  remote_index_updated_at?: string;
  root_folder_id?: string;
  clients_folder_id?: string;
  media_folder_id?: string;
  meta_file_id?: string;
  clients_index_file_id?: string;
  last_sync_at?: string;
  last_sync_error?: string;
}

export interface ClientSyncState {
  client_id: string;
  remote_updated_at?: string;
  remote_version?: number;
  last_synced_at?: string;
}

export interface AppSettings {
  id: 'default';
  google_drive_sync_enabled: boolean;
  google_calendar_connected: boolean;
  google_calendar_id: string | null;
  google_calendar_name: string | null;
  google_calendar_account_email: string | null;
  google_calendar_connected_at: string | null;
  google_calendar_last_sync_at: string | null;
  google_calendar_last_error: string | null;
  google_calendar_enabled_on_this_device: boolean;
}

export type CalendarEventKind =
  | 'session_main'
  | 'session_completion_check'
  | 'session_completion_snooze'
  | 'measurement_session_note';

export type CalendarEventStatus =
  | 'pending_create'
  | 'synced'
  | 'pending_update'
  | 'pending_delete'
  | 'deleted'
  | 'failed';

export interface CalendarEvent {
  id: string;
  local_entity_type: 'session';
  local_entity_id: string;
  client_id: string;
  google_calendar_id: string | null;
  google_event_id: string | null;
  event_kind: CalendarEventKind;
  status: CalendarEventStatus;
  scheduled_start_at: string;
  scheduled_end_at: string;
  title: string;
  description: string;
  color_id: string | null;
  reminder_minutes: number[];
  last_error: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export type CalendarSyncQueueAction = 'create' | 'update' | 'delete';
export type CalendarSyncQueueStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface CalendarSyncQueueEntry {
  id: string;
  calendar_event_local_id: string;
  local_entity_type: 'session';
  local_entity_id: string;
  client_id: string;
  action: CalendarSyncQueueAction;
  status: CalendarSyncQueueStatus;
  retry_count: number;
  last_error: string | null;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DriveMeta {
  version: number;
  updated_at: string;
}

export interface DriveClientIndexEntry {
  id: string;
  version: number;
  updated_at: string;
  deleted: boolean;
  file_id?: string;
}

export interface DriveClientsIndex {
  version: number;
  updated_at: string;
  clients: DriveClientIndexEntry[];
}

export interface DriveClientSnapshot {
  version: number;
  updated_at: string;
  deleted: boolean;
  client: Client;
  profile: ClientProfile;
  lifestyle: ClientLifestyle;
  assessment: ClientAssessment;
  measurementConfigs: MeasurementConfig[];
  measurements: Measurement[];
  plans: Plan[];
  dietPlans: DietPlan[];
  sessions: Session[];
  sessionResults: SessionResult[];
  exercises: Exercise[];
  progressPhotos: ProgressPhoto[];
}

export interface DashboardClient {
  id: string;
  name: string;
  goal: string;
}

export interface DashboardClientState {
  status: ClientStatus;
  nextSession: string;
}

export interface DashboardScheduleItem {
  id: string;
  client_id: string;
  client_name: string;
  date: string;
  start_time: string;
  focus: string;
  duration_minutes: number;
}

export interface DashboardStats {
  clients: DashboardClient[];
  todaySessions: DashboardScheduleItem[];
  activeClientCount: number;
  clientDataMap: Record<string, DashboardClientState>;
}

export interface ScheduledSession extends Session {
  client_name: string;
}

export interface SessionActivityEntry {
  id: string;
  date: string;
  focus: string;
  start_time: string;
  duration_minutes: number;
  status: 'completed' | 'missed';
  energy_level?: number;
  perceived_difficulty?: number;
  performance_notes?: string;
  missed_reason?: string;
  missed_note?: string;
}

export interface ClientProgress {
  measurements: Measurement[];
  measurementConfigs: MeasurementConfig[];
  latestMeasurement: Measurement | null;
}

export interface ClientDetail {
  client: Client;
  profile: ClientProfile;
  lifestyle: ClientLifestyle;
  assessment: ClientAssessment;
  plans: Plan[];
  dietPlans: DietPlan[];
  sessions: Session[];
  exercises: Exercise[];
  sessionResults: SessionResult[];
  measurementConfigs: MeasurementConfig[];
  measurements: Measurement[];
  progressPhotos: ProgressPhoto[];
  status: ClientStatus;
  activities: SessionActivityEntry[];
}

export interface CreateClientInput {
  name: string;
  phone?: string;
  email?: string;
  goal?: string;
  profile?: Partial<Omit<ClientProfile, 'client_id' | 'updated_at'>>;
  lifestyle?: Partial<Omit<ClientLifestyle, 'client_id' | 'updated_at'>>;
  assessment?: Partial<Omit<ClientAssessment, 'client_id' | 'updated_at'>>;
}

export interface UpdateClientInput {
  core?: Partial<Pick<Client, 'name' | 'phone' | 'email' | 'goal' | 'overview_notes'>>;
  profile?: Partial<Omit<ClientProfile, 'client_id' | 'updated_at'>>;
  lifestyle?: Partial<Omit<ClientLifestyle, 'client_id' | 'updated_at'>>;
  assessment?: Partial<Omit<ClientAssessment, 'client_id' | 'updated_at'>>;
}

export interface UpdateSessionInput {
  plan_id?: string | null;
  date?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  day_name?: string;
  focus?: string;
  type?: SessionType;
  status?: SessionStatus;
  missed_reason?: MissedReason;
  missed_note?: string;
  postponed_note?: string;
  original_date?: string;
  notes?: string;
  measure_reminder?: boolean;
}
