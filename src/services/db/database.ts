// ─────────────────────────────────────────────────────────────────────────────
// Database — SQLite initialization
// Source of truth: resrc/system_prompt.md §3
// ─────────────────────────────────────────────────────────────────────────────

import * as SQLite from 'expo-sqlite';
import { CREATE_INDEXES, CREATE_TABLES } from './schema';

const DB_NAME = 'fit_persona_v3.db';

let _db: SQLite.SQLiteDatabase | null = null;

/**
 * Returns the singleton SQLite database instance.
 * Call initDatabase() before using this.
 */
export function getDB(): SQLite.SQLiteDatabase {
  if (!_db) {
    throw new Error(
      '[DB] Database not initialized. Call initDatabase() first.'
    );
  }
  if (typeof window !== 'undefined') {
    (window as any).__expo_db = _db;
  }
  return _db;
}

/**
 * Opens the database and runs all CREATE TABLE + CREATE INDEX statements.
 * Safe to call on every app launch — all statements use IF NOT EXISTS.
 *
 * Also runs the sync_queue restart recovery required by §5.5:
 *   UPDATE sync_queue SET status = 'pending', next_retry_at = NULL
 *   WHERE status = 'processing'
 */
export async function initDatabase(): Promise<void> {
  if (_db) return; // Already initialized

  _db = await SQLite.openDatabaseAsync(DB_NAME);

  // Enable WAL mode for better concurrent read performance
  await _db.execAsync('PRAGMA journal_mode = WAL;');
  // Enforce foreign key constraints
  await _db.execAsync('PRAGMA foreign_keys = ON;');

  // Create all tables in dependency order
  for (const statement of CREATE_TABLES) {
    await _db.execAsync(statement);
  }

  // Create all required indexes
  for (const statement of CREATE_INDEXES) {
    await _db.execAsync(statement);
  }

  // §5.5 — App restart recovery:
  // Any entry stuck in 'processing' means the app crashed mid-sync.
  // Reset them to 'pending' so the worker picks them up again.
  await _db.execAsync(`
    UPDATE sync_queue
    SET status = 'pending', next_retry_at = NULL
    WHERE status = 'processing'
  `);

  // Migration logic for production reliability:
  // Dynamically add columns if missing due to interrupted creation or browser cache quirks
  const migrations = [
    'ALTER TABLE sessions ADD COLUMN start_time TEXT;',
    'ALTER TABLE sessions ADD COLUMN end_time TEXT;',
    'ALTER TABLE sessions ADD COLUMN duration_minutes INTEGER;',
    'ALTER TABLE sessions ADD COLUMN day_name TEXT;',
    'ALTER TABLE sessions ADD COLUMN focus TEXT;',
    'ALTER TABLE sessions ADD COLUMN type TEXT;',
    'ALTER TABLE sessions ADD COLUMN status TEXT;',
    'ALTER TABLE sessions ADD COLUMN postponed_note TEXT;',
    'ALTER TABLE sessions ADD COLUMN original_date TEXT;',
    'ALTER TABLE sessions ADD COLUMN notes TEXT;',
    'ALTER TABLE exercises ADD COLUMN order_index INTEGER;',
    'ALTER TABLE exercises ADD COLUMN target_sets INTEGER;',
    'ALTER TABLE exercises ADD COLUMN target_reps TEXT;',
    'ALTER TABLE exercises ADD COLUMN notes TEXT;',
    'ALTER TABLE exercises ADD COLUMN sets_json TEXT;',
    'ALTER TABLE exercises ADD COLUMN progression_note TEXT;',
    'ALTER TABLE measurements ADD COLUMN height_cm REAL;',
    'ALTER TABLE measurements ADD COLUMN body_fat_pct REAL;',
    'ALTER TABLE measurements ADD COLUMN chest_cm REAL;',
    'ALTER TABLE measurements ADD COLUMN waist_cm REAL;',
    'ALTER TABLE measurements ADD COLUMN hips_cm REAL;',
    'ALTER TABLE measurements ADD COLUMN arm_cm REAL;',
    'ALTER TABLE measurements ADD COLUMN thigh_cm REAL;',
    'ALTER TABLE measurements ADD COLUMN neck_cm REAL;',
    'ALTER TABLE measurements ADD COLUMN calf_cm REAL;',
    'ALTER TABLE measurements ADD COLUMN pull_strength_kg REAL;',
    'ALTER TABLE measurements ADD COLUMN push_strength_kg REAL;',
    'ALTER TABLE measurements ADD COLUMN lower_body_strength_kg REAL;',
    'ALTER TABLE measurements ADD COLUMN cardio_endurance_min REAL;',
    "ALTER TABLE measurements ADD COLUMN custom_values_json TEXT NOT NULL DEFAULT '{}';",
    'ALTER TABLE sessions ADD COLUMN measure_reminder INTEGER DEFAULT 0;',
    'ALTER TABLE client_profiles ADD COLUMN medications TEXT;'
  ];

  for (const m of migrations) {
    try {
      await _db.execAsync(m);
    } catch (e) {
      // Column likely already exists
    }
  }
}
