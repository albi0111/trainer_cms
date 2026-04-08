import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../../database/firebase';
import { clientConverter } from '../../../database/converters/clientConverter';
import { measurementConverter } from '../../../database/converters/measurementConverter';
import { Client, ClientProfile, ClientMeasurement, ClientWithProfile } from '../types';
import { getUpdatePayload, getCreatePayload } from '../../../shared/utils/syncUtils';
import { generateSearchTokens } from '../../../shared/utils/searchUtils';
import { sanitizeUpdate, lbsToKg, inchesToCm } from '../../../shared/utils/sanitizeUtils';

const CLIENTS_COLLECTION = 'clients';
const MEASUREMENTS_SUB = 'measurements';

// ─── Input types ──────────────────────────────────────────────────────────────

/**
 * Raw measurement input from the UI/form layer.
 * Values may be in imperial if unit_system === 'imperial'.
 * The service converts all values to metric before writing.
 */
export interface MeasurementInput {
  date: Date;
  unit_system: 'metric' | 'imperial';
  source?: 'manual' | 'device';
  weight?: number;        // kg if metric, lbs if imperial
  height?: number;        // cm if metric, inches if imperial
  waist?: number;         // cm if metric, inches if imperial
  hip?: number;           // cm if metric, inches if imperial
  chest?: number;         // cm if metric, inches if imperial
  body_fat_pct?: number;  // always %
  notes?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const clientService = {

  // ── Client list subscription ───────────────────────────────────────────────

  /**
   * Live subscription to the active client list.
   * Returns an unsubscribe function — call on screen/store cleanup.
   * Local search/filter is intentional (done by caller); avoids Firestore index complexity.
   */
  subscribeToClients(
    onUpdate: (clients: ClientWithProfile[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const q = query(
      collection(db, CLIENTS_COLLECTION).withConverter(clientConverter),
      where('deleted', '==', false),
      orderBy('name')
    );
    return onSnapshot(
      q,
      (snapshot) => onUpdate(snapshot.docs.map((d) => d.data())),
      (error) => onError(error)
    );
  },

  // ── Create client ──────────────────────────────────────────────────────────

  /**
   * Creates a new client with only name required.
   * Profile fields are optional — passed through sanitizeUpdate() before write.
   * Initial stored status is 'active' (derived status will be 'incomplete' until
   * measurements are added).
   *
   * Returns the new document ID.
   */
  async createClient(
    name: string,
    profile?: Partial<ClientProfile>
  ): Promise<string> {
    const safeProfile = profile ? sanitizeUpdate(profile) : {};
    const search_tokens = generateSearchTokens(name);

    const payload = await getCreatePayload({
      name,
      status: 'active' as const,   // stored default; deriveClientStatus handles display
      search_tokens,
      ...safeProfile,
    });

    const docRef = await addDoc(
      collection(db, CLIENTS_COLLECTION).withConverter(clientConverter),
      payload as unknown as ClientWithProfile
    );
    return docRef.id;
  },

  // ── Update profile (merge — never overwrites existing) ────────────────────

  /**
   * Partially updates a client's core name or profile fields.
   * Uses setDoc with merge:true — ONLY provided fields are written.
   * Empty strings, null, undefined are stripped by sanitizeUpdate() before write.
   *
   * This means a form that clears a field will NOT blank it in Firestore —
   * the trainer must explicitly want to remove a value (future feature).
   */
  async updateProfile(
    id: string,
    data: { name?: string } & Partial<ClientProfile>,
    currentVersion: number
  ): Promise<void> {
    const safeData = sanitizeUpdate(data);
    if (Object.keys(safeData).length === 0) return; // nothing to write

    // Regenerate search tokens if name changed
    const updateData: Record<string, unknown> = { ...safeData };
    if (safeData.name) {
      updateData.search_tokens = generateSearchTokens(safeData.name as string);
    }

    const payload = await getUpdatePayload(updateData, currentVersion);
    const docRef = doc(db, CLIENTS_COLLECTION, id).withConverter(clientConverter);

    // setDoc with merge:true — fields not in payload are untouched
    await setDoc(docRef, payload as unknown as ClientWithProfile, { merge: true });
  },

  // ── Mark client inactive ───────────────────────────────────────────────────

  /**
   * Sets stored status to 'inactive' — the only status value that is explicitly stored.
   * deriveClientStatus() will respect this override regardless of measurements.
   */
  async setInactive(id: string, currentVersion: number): Promise<void> {
    const payload = await getUpdatePayload({ status: 'inactive' as const }, currentVersion);
    const docRef = doc(db, CLIENTS_COLLECTION, id).withConverter(clientConverter);
    await setDoc(docRef, payload as unknown as ClientWithProfile, { merge: true });
  },

  // ── Soft delete ───────────────────────────────────────────────────────────

  /**
   * Soft-deletes by setting deleted=true. Removed from the subscribeToClients query immediately.
   */
  async softDeleteClient(id: string, currentVersion: number): Promise<void> {
    const docRef = doc(db, CLIENTS_COLLECTION, id);
    const payload = await getUpdatePayload(
      { deleted: true, deleted_at: serverTimestamp() },
      currentVersion
    );
    await updateDoc(docRef, payload);
  },

  // ── Measurements (subcollection) ───────────────────────────────────────────

  /**
   * Appends a new measurement to clients/{clientId}/measurements.
   * APPEND-ONLY: addDoc is always used — updateDoc on a measurement is NEVER called.
   *
   * METRIC ENFORCEMENT:
   *   If input.unit_system === 'imperial', converts weight (lbs→kg) and lengths (in→cm)
   *   before writing. All stored values are metric.
   *
   * Returns the new measurement document ID.
   */
  async addMeasurement(
    clientId: string,
    input: MeasurementInput
  ): Promise<string> {
    const isImperial = input.unit_system === 'imperial';

    // Convert to metric if needed — service layer is the single conversion point
    const metric: Partial<Pick<ClientMeasurement,
      'weight_kg' | 'height_cm' | 'waist_cm' | 'hip_cm' | 'chest_cm' | 'body_fat_pct'
    >> = {};

    if (input.weight   != null) metric.weight_kg    = isImperial ? lbsToKg(input.weight)   : input.weight;
    if (input.height   != null) metric.height_cm    = isImperial ? inchesToCm(input.height) : input.height;
    if (input.waist    != null) metric.waist_cm     = isImperial ? inchesToCm(input.waist)  : input.waist;
    if (input.hip      != null) metric.hip_cm       = isImperial ? inchesToCm(input.hip)    : input.hip;
    if (input.chest    != null) metric.chest_cm     = isImperial ? inchesToCm(input.chest)  : input.chest;
    if (input.body_fat_pct != null) metric.body_fat_pct = input.body_fat_pct; // always %

    const safeNotes = input.notes?.trim().slice(0, 300); // enforce 300-char cap

    const payload = await getCreatePayload({
      client_id:   clientId,
      date:        Timestamp.fromDate(input.date),
      unit_system: input.unit_system,
      source:      input.source ?? 'manual',
      ...metric,
      ...(safeNotes ? { notes: safeNotes } : {}),
    });

    const colRef = collection(
      db,
      CLIENTS_COLLECTION,
      clientId,
      MEASUREMENTS_SUB
    ).withConverter(measurementConverter);

    const docRef = await addDoc(colRef, payload as unknown as ClientMeasurement);
    return docRef.id;
  },

  /**
   * Live subscription to a client's measurement subcollection.
   * Results ordered newest-first (date DESC) for display.
   * Returns an unsubscribe function — call on hook/screen cleanup.
   */
  subscribeMeasurements(
    clientId: string,
    onUpdate: (measurements: ClientMeasurement[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const q = query(
      collection(db, CLIENTS_COLLECTION, clientId, MEASUREMENTS_SUB).withConverter(measurementConverter),
      where('deleted', '==', false),
      orderBy('date', 'desc')
    );
    return onSnapshot(
      q,
      (snapshot) => onUpdate(snapshot.docs.map((d) => d.data())),
      (error) => onError(error)
    );
  },
};
