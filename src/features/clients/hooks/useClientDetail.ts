import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../database/firebase';
import { clientConverter }   from '../../../database/converters/clientConverter';
import { ClientWithProfile, ClientMeasurement, ClientAnalytics, ClientDisplayStatus } from '../types';
import { clientService }      from '../services/clientService';
import { deriveClientStatus } from '../utils/deriveClientStatus';

interface ClientDetailState {
  client:        ClientWithProfile | null;
  measurements:  ClientMeasurement[];
  displayStatus: ClientDisplayStatus;
  analytics:     ClientAnalytics;
  isLoading:     boolean;
  error:         string | null;
}

/**
 * Live hook for ClientDetailScreen.
 *
 * Manages two concurrent Firestore subscriptions:
 *   1. Single client document (core + all profile fields)
 *   2. Measurements subcollection (ordered date DESC)
 *
 * Both listeners clean up on unmount.
 *
 * STATUS:
 *   Calls deriveClientStatus() on every state update.
 *   Returns `displayStatus` — the UI MUST use this, never client.status directly.
 *
 * ANALYTICS:
 *   Derived in-memory from the measurement array — nothing stored in Firestore.
 *   Session-based fields (attendanceRate, totalSessions) are null until Phase 2.
 */
export function useClientDetail(clientId: string): ClientDetailState {
  const [client,       setClient]       = useState<ClientWithProfile | null>(null);
  const [measurements, setMeasurements] = useState<ClientMeasurement[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  // ── Client document subscription ────────────────────────────────────────────
  useEffect(() => {
    if (!clientId) return;

    const docRef = doc(db, 'clients', clientId).withConverter(clientConverter);
    const unsub = onSnapshot(
      docRef,
      (snapshot) => {
        setClient(snapshot.exists() ? snapshot.data() : null);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, [clientId]);

  // ── Measurements subcollection subscription ──────────────────────────────────
  useEffect(() => {
    if (!clientId) return;
    const unsub = clientService.subscribeMeasurements(
      clientId,
      (data) => setMeasurements(data),
      (err)  => setError(err.message)
    );
    return () => unsub();
  }, [clientId]);

  // ── Derived status ───────────────────────────────────────────────────────────
  // Pure function — called every render with current data. No memoisation needed.
  const displayStatus: ClientDisplayStatus = client
    ? deriveClientStatus(client.status, measurements)
    : 'incomplete';

  // ── Derived analytics ────────────────────────────────────────────────────────
  // measurements is sorted DESC (newest first) — service guarantees this ordering.
  const analytics: ClientAnalytics = (() => {
    if (measurements.length === 0) {
      return {
        weightChange:        null,
        lastMeasurementDate: null,
        totalMeasurements:   0,
        attendanceRate:      null,  // Phase 2
        totalSessions:       null,  // Phase 2
      };
    }

    const newest = measurements[0];
    const oldest = measurements[measurements.length - 1];

    // Weight change: newest − oldest (both in kg — metric guaranteed by service)
    const weightChange =
      newest.weight_kg != null && oldest.weight_kg != null
        ? Math.round((newest.weight_kg - oldest.weight_kg) * 100) / 100
        : null;

    return {
      weightChange,
      lastMeasurementDate: newest.date,
      totalMeasurements:   measurements.length,
      attendanceRate:      null,  // Phase 2
      totalSessions:       null,  // Phase 2
    };
  })();

  return { client, measurements, displayStatus, analytics, isLoading, error };
}
