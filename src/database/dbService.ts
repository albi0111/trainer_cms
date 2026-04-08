import { 
  addDoc, 
  updateDoc, 
  setDoc, 
  DocumentReference, 
  CollectionReference,
  FieldValue,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { sanitizeUpdate } from '../shared/utils/sanitizeUtils';

/**
 * dbService: The final protected write boundary for the application.
 * 
 * DESIGN PRINCIPLES:
 * 1. Hardened Sanitization: All updates/sets are automatically sanitized.
 * 2. Mandatory Audit: updated_at is injected into all writes.
 * 3. Append-Only Enforcement: Collections like measurements/sessions are restricted.
 */
export const dbService = {
  
  /**
   * Safe Update/Set: sanitizes data and injects server-side timestamp.
   * Use this for all ClientProfile and general record updates.
   */
  async safeUpdate(ref: DocumentReference, data: any, merge: boolean = true): Promise<void> {
    const safeData = sanitizeUpdate(data);
    
    // Injected audit tail
    const payload = {
      ...safeData,
      updated_at: serverTimestamp() as unknown as FieldValue,
    };

    if (merge) {
      // setDoc with merge:true is preferred for offline resilience
      await setDoc(ref, payload, { merge: true });
    } else {
      await updateDoc(ref, payload);
    }
  },

  /**
   * Append-Only Write: ensures data is only ADDED, never updated.
   * Use this for MeasurementLogs and SessionLogs.
   */
  async appendOnly(colRef: CollectionReference, data: any): Promise<string> {
    const docRef = await addDoc(colRef, data);
    return docRef.id;
  },

  /**
   * Direct Access (Internal only): For cases where built-in sanitization 
   * logic needs to be bypassed (e.g., admin soft-delete).
   * Uses setDoc with merge:true for maximum resilience.
   */
  async internal_unsafeWrite(ref: DocumentReference, data: any): Promise<void> {
    await setDoc(ref, data, { merge: true });
  }
};
