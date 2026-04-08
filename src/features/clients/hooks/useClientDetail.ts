import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../database/firebase';
import { clientConverter }   from '../../../database/converters/clientConverter';
import { ClientWithProfile, ClientMeasurement, ClientAnalytics, ClientDisplayStatus, MeasurementTrend } from '../types';
import { clientService }     from '../services/clientService';
import { sessionService }    from '../../sessions/services/sessionService';
import { SessionLog }        from '../../sessions/types';
import { deriveClientStatus } from '../utils/deriveClientStatus';

interface ClientDetailState {
  client:        ClientWithProfile | null;
  measurements:  ClientMeasurement[];
  sessions:      SessionLog[];
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
 *   2. Measurements subcollection (latest 50, ordered date DESC)
 *
 * Both listeners clean up on unmount — no memory leaks.
 *
 * STATUS:
 *   Calls deriveClientStatus() via ClientStatusContext on every state update.
 *   Returns `displayStatus` — the UI MUST use this, never client.status directly.
 *   Phase 2: pass hasSessions to context once Session system is live.
 *
 * ANALYTICS:
 *   Derived in-memory from the measurement array — nothing stored in Firestore.
 *   Follows the strict ClientAnalytics contract defined in types/index.ts.
 */
export function useClientDetail(clientId: string): ClientDetailState {
  const [client,       setClient]       = useState<ClientWithProfile | null>(null);
  const [measurements, setMeasurements] = useState<ClientMeasurement[]>([]);
  const [sessions,     setSessions]     = useState<SessionLog[]>([]);
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

  // ── Measurements subscription (latest 50, date DESC) ────────────────────────
  useEffect(() => {
    if (!clientId) return;
    const unsub = clientService.subscribeMeasurements(
      clientId,
      (data) => setMeasurements(data),
      (err)  => setError(err.message)
    );
    return () => unsub();
  }, [clientId]);

  // ── Session subscription (latest 50, date DESC) ─────────────────────────────
  useEffect(() => {
    if (!clientId) return;
    const unsub = sessionService.subscribeSessionLogs(
      clientId,
      (data) => setSessions(data),
      (err)  => setError(err.message)
    );
    return () => unsub();
  }, [clientId]);

  // ── Derived status ───────────────────────────────────────────────────────────
  // Uses ClientStatusContext — extensible when Phase 2 session signals are available.
  // Pass hasSessions: sessions.length > 0 here once the Session system is live.
  const displayStatus: ClientDisplayStatus = client
    ? deriveClientStatus({
        storedStatus:    client.status,
        hasMeasurements: measurements.length > 0,
        hasSessions:     sessions.length > 0,
      })
    : 'incomplete';

  // ── Derived analytics ────────────────────────────────────────────────────────
  // Follows the strict ClientAnalytics contract. All values computed from the
  // live measurement array — no Firestore reads, no storage, deterministic.
  //
  // measurements is ordered date DESC (service guarantees this).
  //   measurements[0]                  = newest
  //   measurements[measurements.length-1] = oldest
  const analytics: ClientAnalytics = (() => {
    // Extract only measurements that have a weight reading for weight-based calculations
    const withWeight = measurements.filter((m) => m.weight_kg != null);

    const latestWeight:      number | null = withWeight[0]?.weight_kg ?? null;
    const lastMeasurementDate: Date | null = measurements[0]?.date    ?? null;
    const measurementCount:  number        = measurements.length;

    const totalSessions:     number        = sessions.length;
    const lastSessionDate:   Date | null   = sessions[0]?.date        ?? null;

    // Weight change: newest weight − oldest weight (both metric kg, guaranteed by service)
    let weightChange: number | null = null;
    if (withWeight.length >= 2) {
      const newest = withWeight[0].weight_kg!;
      const oldest = withWeight[withWeight.length - 1].weight_kg!;
      weightChange = Math.round((newest - oldest) * 100) / 100;
    }

    // Trend — requires at least 2 weight readings; ±0.5 kg threshold for "stable"
    let measurementTrend: MeasurementTrend = 'insufficient';
    if (weightChange !== null) {
      if (weightChange < -0.5)       measurementTrend = 'improving'; // weight loss
      else if (weightChange > 0.5)   measurementTrend = 'gaining';   // weight gain
      else                           measurementTrend = 'stable';
    }

    return {
      latestWeight,
      weightChange,
      measurementCount,
      measurementTrend,
      lastMeasurementDate,
      totalSessions,
      lastSessionDate,
    };
  })();

  return { client, measurements, sessions, displayStatus, analytics, isLoading, error };
}
