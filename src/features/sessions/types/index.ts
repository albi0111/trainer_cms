import { BaseModel } from '../../../types/base';

/**
 * Session Status: Current state of a planned or executed session.
 */
export type SessionStatus = 'completed' | 'missed' | 'skipped' | 'planned';

/**
 * Session Type: Categorization for filtering and context.
 */
export type SessionType = 'workout' | 'diet' | 'check-in';

/**
 * Exercise Set: A single set of an exercise.
 * All weights are stored in Metric (kg).
 */
export interface ExerciseSet {
  reps: number;
  weight_kg: number;
  rpe?: number;          // Rate of Perceived Exertion (1-10)
  rest_seconds?: number;
}

/**
 * Workout Exercise: A specific exercise performed in a session.
 */
export interface WorkoutExercise {
  exercise_id: string;   // Stable UUID/ID for history tracking across sessions
  name: string;          // Display name (can change, exercise_id stays same)
  sets: ExerciseSet[];
  notes?: string;
}

/**
 * Workout Data: The payload for a session of type 'workout'.
 */
export interface WorkoutData {
  exercises: WorkoutExercise[];
  intensity_score?: number; // Overall session intensity (optional)
}

/**
 * SessionLog: An immutable record of a session event.
 * Stored in: clients/{clientId}/session_logs/{id}
 * 
 * APPEND-ONLY RULE:
 * Never update or delete a SessionLog. If a correction is needed, 
 * add a NEW log with corrected data and a reference to the old one.
 */
export interface SessionLog extends BaseModel {
  client_id: string;     // FK -> clients/{id}
  date: Date;            // The intended/actual date of the session
  type: SessionType;
  status: SessionStatus;
  
  // Conditional data
  workout_data?: WorkoutData;
  missed_reason?: string; // Mandatory if status === 'missed'
  notes?: string;
  
  // Audit Context
  source: 'manual' | 'automated';
}

/**
 * Input for creating a new session log.
 */
export interface SessionLogInput {
  date: Date;
  type: SessionType;
  status: SessionStatus;
  unit_system: 'metric' | 'imperial';
  
  workout_data?: WorkoutData;
  missed_reason?: string;
  notes?: string;
}
