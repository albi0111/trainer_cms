// ─────────────────────────────────────────────────────────────────────────────
// SQLite Schema — ALL tables + indexes
// Source of truth: resrc/system_prompt.md §3
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Statements are ordered by dependency (parents before children).
 * Every statement uses IF NOT EXISTS so it is safe to re-run on every launch.
 */
export const CREATE_TABLES: string[] = [
  // ── clients (parent of almost everything) ────────────────────────────────
  `CREATE TABLE IF NOT EXISTS clients (
    id             TEXT PRIMARY KEY NOT NULL,
    name           TEXT NOT NULL,
    phone          TEXT,
    email          TEXT,
    goal           TEXT NOT NULL,
    overview_notes TEXT,
    version        INTEGER NOT NULL DEFAULT 1,
    sync_status    TEXT NOT NULL DEFAULT 'pending'
                   CHECK(sync_status IN ('synced', 'pending', 'pending_delete')),
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  )`,

  // ── client_profiles (1:1 with clients) ───────────────────────────────────
  `CREATE TABLE IF NOT EXISTS client_profiles (
    client_id           TEXT PRIMARY KEY NOT NULL
                          REFERENCES clients(id),
    age                 INTEGER NOT NULL,
    gender              TEXT NOT NULL CHECK(gender IN ('male', 'female', 'other')),
    height_cm           REAL NOT NULL,
    initial_weight_kg   REAL NOT NULL,
    medical_notes       TEXT,
    photo_uri           TEXT,
    updated_at          TEXT NOT NULL
  )`,

  // ── client_lifestyles (1:1, all fields optional) ──────────────────────────
  `CREATE TABLE IF NOT EXISTS client_lifestyles (
    client_id           TEXT PRIMARY KEY NOT NULL
                          REFERENCES clients(id),
    sleep_hours_avg     REAL,
    stress_level        TEXT CHECK(stress_level IN ('low', 'medium', 'high')),
    activity_level      TEXT CHECK(activity_level IN ('sedentary', 'moderate', 'active')),
    diet_type           TEXT CHECK(diet_type IN ('veg', 'non-veg', 'mixed')),
    water_intake_liters REAL,
    smoking             INTEGER CHECK(smoking IN (0, 1)),
    alcohol             INTEGER CHECK(alcohol IN (0, 1)),
    job_type            TEXT,
    notes               TEXT,
    updated_at          TEXT NOT NULL
  )`,

  // ── client_assessments (1:1, maps to physical assessment sheet) ───────────
  `CREATE TABLE IF NOT EXISTS client_assessments (
    client_id              TEXT PRIMARY KEY NOT NULL
                             REFERENCES clients(id),
    assessed_at            TEXT,
    bp_systolic            INTEGER,
    bp_diastolic           INTEGER,
    resting_heart_rate     INTEGER,
    vitals_remarks         TEXT,
    exercises_json         TEXT NOT NULL DEFAULT '[]',
    cardio_time_minutes    REAL,
    cardio_distance_km     REAL,
    cardio_mhr             INTEGER,
    flexibility_json       TEXT NOT NULL DEFAULT '[]',
    objectives             TEXT,
    updated_at             TEXT NOT NULL
  )`,

  // ── measurements (append-only time-series) ────────────────────────────────
  `CREATE TABLE IF NOT EXISTS measurements (
    id           TEXT PRIMARY KEY NOT NULL,
    client_id    TEXT NOT NULL REFERENCES clients(id),
    date         TEXT NOT NULL,
    weight_kg    REAL,
    height_cm    REAL,
    body_fat_pct REAL,
    chest_cm     REAL,
    waist_cm     REAL,
    hips_cm      REAL,
    arm_cm       REAL,
    thigh_cm     REAL,
    neck_cm      REAL,
    calf_cm      REAL,
    pull_strength_kg REAL,
    push_strength_kg REAL,
    lower_body_strength_kg REAL,
    cardio_endurance_min REAL,
    custom_values_json TEXT NOT NULL DEFAULT '{}',
    notes        TEXT,
    created_at   TEXT NOT NULL,
    UNIQUE(client_id, date)
  )`,

  // ── client_measurement_configs (per-client dynamic fields) ────────────────
  `CREATE TABLE IF NOT EXISTS client_measurement_configs (
    client_id    TEXT NOT NULL REFERENCES clients(id),
    key          TEXT NOT NULL,
    label        TEXT NOT NULL,
    unit         TEXT,
    category     TEXT NOT NULL CHECK(category IN ('body', 'performance')),
    target_min   REAL,
    target_max   REAL,
    updated_at   TEXT NOT NULL,
    PRIMARY KEY (client_id, key)
  )`,

  // ── progress_photos (append-only, tracks upload state) ────────────────────
  `CREATE TABLE IF NOT EXISTS progress_photos (
    id                TEXT PRIMARY KEY NOT NULL,
    client_id         TEXT NOT NULL REFERENCES clients(id),
    uri               TEXT NOT NULL,
    date              TEXT NOT NULL,
    type              TEXT CHECK(type IN ('front', 'side', 'back')),
    note              TEXT,
    file_size_bytes   INTEGER,
    drive_file_id     TEXT,
    upload_status     TEXT NOT NULL DEFAULT 'local'
                        CHECK(upload_status IN ('local', 'uploaded', 'failed')),
    created_at        TEXT NOT NULL
  )`,

  // ── plans (self-referencing via parent_plan_id) ───────────────────────────
  `CREATE TABLE IF NOT EXISTS plans (
    id             TEXT PRIMARY KEY NOT NULL,
    client_id      TEXT NOT NULL REFERENCES clients(id),
    type           TEXT NOT NULL CHECK(type IN ('monthly', 'weekly')),
    title          TEXT NOT NULL,
    goal           TEXT NOT NULL,
    start_date     TEXT NOT NULL,
    end_date       TEXT NOT NULL,
    parent_plan_id TEXT REFERENCES plans(id),
    order_index    INTEGER,
    status         TEXT NOT NULL DEFAULT 'upcoming'
                     CHECK(status IN ('upcoming', 'active', 'completed')),
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  )`,

  // ── diet_plans ────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS diet_plans (
    id           TEXT PRIMARY KEY NOT NULL,
    client_id    TEXT NOT NULL REFERENCES clients(id),
    title        TEXT NOT NULL,
    goal         TEXT NOT NULL,
    start_date   TEXT,
    end_date     TEXT,
    calories     REAL,
    protein_g    REAL,
    carbs_g      REAL,
    fats_g       REAL,
    water_liters REAL,
    meals_json   TEXT NOT NULL DEFAULT '[]',
    meal_notes   TEXT,
    notes        TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
  )`,

  // ── sessions (append-only; plan_id nullable for manual sessions) ──────────
  `CREATE TABLE IF NOT EXISTS sessions (
    id            TEXT PRIMARY KEY NOT NULL,
    plan_id       TEXT REFERENCES plans(id),
    client_id     TEXT NOT NULL REFERENCES clients(id),
    date          TEXT NOT NULL,
    start_time    TEXT,
    end_time      TEXT,
    duration_minutes INTEGER,
    day_name      TEXT NOT NULL,
    focus         TEXT NOT NULL,
    type          TEXT NOT NULL CHECK(type IN ('strength', 'cardio', 'mobility', 'mixed')),
    status        TEXT NOT NULL DEFAULT 'planned'
                    CHECK(status IN ('planned', 'completed', 'missed')),
    missed_reason TEXT CHECK(missed_reason IN ('sick', 'travel', 'busy', 'no_show', 'other')),
    missed_note   TEXT,
    postponed_note TEXT,
    notes         TEXT,
    original_date TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    measure_reminder INTEGER DEFAULT 0
  )`,

  // ── session_results (1:1, only for completed sessions) ────────────────────
  `CREATE TABLE IF NOT EXISTS session_results (
    session_id           TEXT PRIMARY KEY NOT NULL REFERENCES sessions(id),
    perceived_difficulty INTEGER NOT NULL CHECK(perceived_difficulty BETWEEN 1 AND 10),
    energy_level         INTEGER NOT NULL CHECK(energy_level BETWEEN 1 AND 10),
    performance_notes    TEXT,
    trainer_notes        TEXT,
    completed_at         TEXT NOT NULL
  )`,

  // ── exercises (immutable after creation, sets stored as JSON) ─────────────
  `CREATE TABLE IF NOT EXISTS exercises (
    id               TEXT PRIMARY KEY NOT NULL,
    session_id       TEXT NOT NULL REFERENCES sessions(id),
    name             TEXT NOT NULL,
    order_index      INTEGER NOT NULL,
    target_sets      INTEGER,
    target_reps      TEXT,
    notes            TEXT,
    sets_json        TEXT NOT NULL DEFAULT '[]',
    progression_note TEXT,
    created_at       TEXT NOT NULL
  )`,

  // ── client_domain_sync_state (per-domain sync timestamps) ────────────────
  `CREATE TABLE IF NOT EXISTS client_domain_sync_state (
    client_id  TEXT NOT NULL REFERENCES clients(id),
    domain     TEXT NOT NULL CHECK(domain IN (
                 'core', 'measurements', 'progress_photos',
                 'plans', 'diet_plans', 'sessions',
                 'session_results', 'exercises'
               )),
    updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00Z',
    PRIMARY KEY (client_id, domain)
  )`,

  // ── sync_queue (dedup: ONE pending entry per client+operation) ─────────────
  `CREATE TABLE IF NOT EXISTS sync_queue (
    id               TEXT PRIMARY KEY NOT NULL,
    client_id        TEXT NOT NULL REFERENCES clients(id),
    operation        TEXT NOT NULL CHECK(operation IN ('update', 'delete')),
    affected_domains TEXT NOT NULL DEFAULT '[]',
    status           TEXT NOT NULL DEFAULT 'pending'
                       CHECK(status IN ('pending', 'processing', 'failed')),
    retry_count      INTEGER NOT NULL DEFAULT 0,
    next_retry_at    TEXT,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    UNIQUE(client_id, operation) ON CONFLICT REPLACE
  )`,
];

/**
 * Required indexes — mandatory per §3.
 * Without them, analytics queries degrade as data grows.
 */
export const CREATE_INDEXES: string[] = [
  `CREATE INDEX IF NOT EXISTS idx_sessions_client_date
     ON sessions(client_id, date)`,

  `CREATE INDEX IF NOT EXISTS idx_sessions_status
     ON sessions(client_id, status)`,

  `CREATE INDEX IF NOT EXISTS idx_measurements_client_date
     ON measurements(client_id, date)`,

  `CREATE INDEX IF NOT EXISTS idx_exercises_session
     ON exercises(session_id)`,

  `CREATE INDEX IF NOT EXISTS idx_plans_client
     ON plans(client_id, type)`,

  `CREATE INDEX IF NOT EXISTS idx_diet_plans_client
     ON diet_plans(client_id)`,

  `CREATE INDEX IF NOT EXISTS idx_progress_photos_client
     ON progress_photos(client_id, date)`,

  `CREATE INDEX IF NOT EXISTS idx_sync_queue_status
     ON sync_queue(status)`,

  `CREATE INDEX IF NOT EXISTS idx_domain_sync_state_client
     ON client_domain_sync_state(client_id)`,
];
