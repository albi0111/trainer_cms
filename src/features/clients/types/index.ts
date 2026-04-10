import { BaseModel } from '../../../types/base';
import { Stack } from '../../../shared/components/layout/Stack';
import { ClientStackParamList } from '../../../app/navigation/AppNavigator';

// ─── Core Client ──────────────────────────────────────────────────────────────
// Minimal document stored in Firestore.
// Contains only what is always present — name, status cache, search index.
//
// STATUS RULE:
//   stored status is ONLY used as a trainer-controlled "inactive" override.
//   'active' and 'incomplete' are NEVER stored — they are ALWAYS derived at runtime.
//   Use deriveClientStatus() for all UI rendering. Never read .status directly.

export interface Client extends BaseModel {
  id: string;                           // Firestore document ID (or tempId)
  client_uuid: string;                  // Primary reconciliation key (UUID)
  name: string;                         // required — the only mandatory field
  status: 'active' | 'inactive' | 'creating'; // Added 'creating' for optimistic UI
  search_tokens: string[];              // prefix-token index for local search, bounded ≤20
  created_at_local: Date;               // Immediate sorting key for optimistic UI
}

// ─── Client Profile ───────────────────────────────────────────────────────────
// Optional extended info — lives on the SAME Firestore document as Client.
// All fields are optional. Field rules:
//   - All string fields: max 500 chars
//   - No arrays
//   - No nested objects
//   - safe to partially update with sanitizeUpdate()

export interface ClientProfile {
  email?: string;
  phone?: string;
  address?: string; // missing but requested in flow
  goal?: string;
  occupation?: string;
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  lifestyle?: string; // added as per user requirement
  sleep_quality?: 'poor' | 'fair' | 'good';
  meal_timing?: string;
  medical_conditions?: string;
  notes?: string;
  session_plan?: string;               // Flexible text field for assignment (e.g. "Mon/Wed/Fri Legs focus")
}

// ─── Combined shape ───────────────────────────────────────────────────────────
// Used in detail screen and useClientDetail hook.
// List screen uses Client only (no profile fields needed for list rendering).

export type ClientWithProfile = Client & ClientProfile;

// ─── Derived Status ───────────────────────────────────────────────────────────
// All possible UI states — includes 'incomplete' which is never stored.

export type ClientDisplayStatus = 'incomplete' | 'active' | 'inactive';

// ─── Measurements ─────────────────────────────────────────────────────────────
// Stored as subcollection: clients/{clientId}/measurements
//
// METRIC RULE (MANDATORY):
//   ALL numeric values are stored in metric units ALWAYS.
//   weight → kg, height/circumferences → cm, body_fat → %
//
//   unit_system records what unit the TRAINER ENTERED in (for display context only).
//   The service layer converts imperial → metric before writing.
//   No imperial values ever reach Firestore.
//
// APPEND-ONLY RULE:
//   Never update a past measurement document.
//   Always addDoc() — never updateDoc() on an existing measurement.

export interface ClientMeasurement extends BaseModel {
  client_id: string;                              // FK → clients/{id}; consistent naming for Session FK
  client_uuid: string;                            // FK → clients.client_uuid
  date: Date;                                     // date measurements were taken (trainer-provided)
  created_at_local: Date;                         // Local timestamp for immediate feedback
  unit_system: 'metric' | 'imperial';             // display context only — values are always metric
  source: 'manual' | 'device';                    // how data was collected, defaults to 'manual'

  // All stored in metric (kg / cm / %)
  weight_kg?: number;
  height_cm?: number;
  waist_cm?: number;
  hip_cm?: number;
  chest_cm?: number;
  body_fat_pct?: number;
  notes?: string;                                 // ≤300 chars
}

// ─── Analytics (Derived — never stored) ──────────────────────────────────────
// Computed by useClientDetail hook from the live measurements array.
// All fields are deterministic and reproducible — no side effects, no Firestore writes.
//
// CONTRACT:
//   - latestWeight    → most recent weight_kg entry; null if no weight logged
//   - weightChange    → newest.weight_kg − oldest.weight_kg; null if <2 weight entries
//   - measurementCount→ total non-deleted measurement documents observed
//   - measurementTrend→ directional summary based on weight readings:
//       'improving'    → weight trending down (positive for fat-loss goals)
//       'gaining'      → weight trending up   (positive for muscle-gain goals)
//       'stable'       → last vs. first Δ within ±0.5 kg
//       'insufficient' → fewer than 2 weight measurements to determine direction
//
// Phase 2 extension:
//   Add session-based fields (attendanceRate, totalSessions) here when
//   the Session system lands. They MUST remain derived — never store them.

export type MeasurementTrend = 'improving' | 'gaining' | 'stable' | 'insufficient';

export interface ClientAnalytics {
  /** Most recent weight reading in kg. Null if no weight ever logged. */
  latestWeight: number | null;

  /** Net weight change (kg) across all measurements: newest − oldest.
   *  Null if fewer than 2 measurements have weight data. */
  weightChange: number | null;

  /** Total number of measurement entries in the current recent window (50). */
  recentMeasurementCount: number;

  /** Directional weight trend across all measurements. */
  measurementTrend: MeasurementTrend;

  /** Date of the most recent measurement. Null if none. */
  lastMeasurementDate: Date | null;

  /** Total number of session logs in the current recent window (50). */
  recentSessionCount: number;

  /** Date of the most recent session log. Null if none. */
  lastSessionDate: Date | null;
}
