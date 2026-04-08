import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  startAfter,
  getDocs,
  Timestamp,
  Unsubscribe,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../../../database/firebase';
import { dbService } from '../../../database/dbService';
import { sessionConverter } from '../../../database/converters/sessionConverter';
import { SessionLog, SessionLogInput, WorkoutData } from '../types';
import { getCreatePayload } from '../../../shared/utils/syncUtils';
import { lbsToKg } from '../../../shared/utils/sanitizeUtils';

const CLIENTS_COLLECTION = 'clients';
const SESSION_LOGS_SUB   = 'session_logs';

const SESSIONS_PAGE_SIZE = 50;

/**
 * sessionService: Manages the immutable audit trail of trainer-client sessions.
 * 
 * ENFORCEMENTS:
 * 1. Deep Validation: Missed reasons and workout data are strictly checked.
 * 2. Metric Integrity: All weights are converted to kg before storage.
 * 3. Append-Only: No update or delete operations are exposed.
 */
export const sessionService = {

  /**
   * Appends a new session log for a client.
   * Performs deep validation and metric conversion.
   */
  async addSessionLog(
    clientId: string,
    input: SessionLogInput
  ): Promise<string> {
    // 1. Deep Validation
    this._validateSessionLog(input);

    // 2. Metric Conversion
    let finalWorkoutData: WorkoutData | undefined = undefined;
    if (input.workout_data) {
      finalWorkoutData = this._convertToMetric(input.workout_data, input.unit_system);
    }

    // 3. Prepare Payload
    const payload = await getCreatePayload({
      client_id:      clientId,
      date:           Timestamp.fromDate(input.date),
      type:           input.type,
      status:         input.status,
      workout_data:   finalWorkoutData,
      missed_reason:  input.missed_reason?.trim(),
      notes:          input.notes?.trim(),
      source:         'manual' as const,
    });

    // 4. Append-Only Write
    const colRef = collection(
      db,
      CLIENTS_COLLECTION,
      clientId,
      SESSION_LOGS_SUB
    ).withConverter(sessionConverter);

    return dbService.appendOnly(colRef, payload as unknown as SessionLog);
  },

  /**
   * Subscribes to the 50 most recent sessions.
   */
  subscribeSessionLogs(
    clientId: string,
    onUpdate: (logs: SessionLog[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const q = query(
      collection(db, CLIENTS_COLLECTION, clientId, SESSION_LOGS_SUB).withConverter(sessionConverter),
      where('deleted', '==', false),
      orderBy('date', 'desc'),
      limit(SESSIONS_PAGE_SIZE)
    );

    return onSnapshot(
      q,
      (snapshot) => onUpdate(snapshot.docs.map(doc => doc.data())),
      (error) => onError(error)
    );
  },

  /**
   * Fetches the next page of sessions for historical view/pagination.
   */
  async loadMoreSessions(
    clientId: string,
    lastVisible: QueryDocumentSnapshot<SessionLog>
  ): Promise<{ logs: SessionLog[], lastVisible: QueryDocumentSnapshot<SessionLog> | null }> {
    const q = query(
      collection(db, CLIENTS_COLLECTION, clientId, SESSION_LOGS_SUB).withConverter(sessionConverter),
      where('deleted', '==', false),
      orderBy('date', 'desc'),
      startAfter(lastVisible),
      limit(SESSIONS_PAGE_SIZE)
    );

    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map(doc => doc.data());
    const newLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

    return { logs, lastVisible: newLastVisible };
  },

  // ── Internal Helpers ────────────────────────────────────────────────────────

  /**
   * Validates internal business rules for session logs.
   * Throws Error if data integrity is at risk.
   */
  _validateSessionLog(input: SessionLogInput) {
    if (input.status === 'missed' && (!input.missed_reason || input.missed_reason.trim() === '')) {
      throw new Error('MISSING_REASON: Missed sessions must document why.');
    }

    if (input.status === 'completed' && input.type === 'workout' && (!input.workout_data || input.workout_data.exercises.length === 0)) {
      throw new Error('MISSING_DATA: Completed workouts must contain tracking data.');
    }

    if (input.workout_data) {
      input.workout_data.exercises.forEach(ex => {
        ex.sets.forEach(set => {
          if (set.reps <= 0) throw new Error(`INVALID_REPS: Exercise "${ex.name}" has 0 or negative reps.`);
          if (set.weight_kg < 0) throw new Error(`INVALID_WEIGHT: Exercise "${ex.name}" has negative weight.`);
        });
      });
    }
  },

  /**
   * Deep-maps workout data to metric (kg) if input was imperial.
   */
  _convertToMetric(data: WorkoutData, unitSystem: 'metric' | 'imperial'): WorkoutData {
    if (unitSystem === 'metric') return data;

    return {
      ...data,
      exercises: data.exercises.map(ex => ({
        ...ex,
        sets: ex.sets.map(set => ({
          ...set,
          weight_kg: lbsToKg(set.weight_kg) // Payload field name stays weight_kg, value is converted from lbs
        }))
      }))
    };
  }
};
