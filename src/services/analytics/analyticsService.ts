import { db, withDatabaseRecovery } from '../../db/db';
import type {
  ClientProgress,
  ClientStatus,
  DashboardStats,
  Plan,
  Session,
} from '../../types';
import { parseMeasurement } from '../shared/clientSnapshotMapper';
import { compareDateTimes, todayLocalIso } from '../shared/date';
import { deriveClientStatusFromData } from '../../utils/clientStatus';

function groupByClient<T extends { client_id: string }>(rows: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const existing = grouped.get(row.client_id) || [];
    existing.push(row);
    grouped.set(row.client_id, existing);
  }
  return grouped;
}

export async function getClientStatus(clientId: string): Promise<ClientStatus> {
  const [plans, sessions] = await withDatabaseRecovery(() => Promise.all([
    db.plans.where('client_id').equals(clientId).toArray(),
    db.sessions.where('client_id').equals(clientId).toArray(),
  ]));

  return deriveClientStatusFromData(sessions, plans);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return withDatabaseRecovery(async () => {
    const today = todayLocalIso();
    const [clients, todaySessions, futurePlannedSessions, completedSessions, plans] = await Promise.all([
      db.clients.where('sync_status').notEqual('pending_delete').sortBy('name'),
      db.sessions.where('[status+date]').equals(['planned', today]).toArray(),
      db.sessions.where('status').equals('planned').filter((session) => session.date >= today).toArray(),
      db.sessions.where('status').equals('completed').toArray(),
      db.plans.toArray(),
    ]);

    const allRelevantSessions = [...futurePlannedSessions, ...completedSessions];
    const sessionsByClient = groupByClient(allRelevantSessions);
    const plansByClient = groupByClient(plans);
    const clientLookup = new Map(clients.map((client) => [client.id, client]));

    const todaySchedule = todaySessions
      .filter((session) => clientLookup.has(session.client_id))
      .sort((a, b) => compareDateTimes(a.date, a.start_time) - compareDateTimes(b.date, b.start_time))
      .map((session) => ({
        id: session.id,
        client_id: session.client_id,
        client_name: clientLookup.get(session.client_id)?.name || 'Unknown Client',
        date: session.date,
        start_time: session.start_time || '--:--',
        focus: session.focus,
        duration_minutes: session.duration_minutes || 60,
      }));

    const clientDataMap: DashboardStats['clientDataMap'] = {};
    let activeClientCount = 0;

    for (const client of clients) {
      const clientSessions = sessionsByClient.get(client.id) || [];
      const clientPlans = plansByClient.get(client.id) || [];
      const status = deriveClientStatusFromData(clientSessions as Session[], clientPlans as Plan[]);
      if (status === 'active') {
        activeClientCount += 1;
      }

      const nextSession = clientSessions
        .filter((session) => session.status === 'planned' && session.date >= today)
        .sort((a, b) => compareDateTimes(a.date, a.start_time) - compareDateTimes(b.date, b.start_time))[0];

      clientDataMap[client.id] = {
        status,
        nextSession: nextSession
          ? `${nextSession.date === today ? 'Today' : nextSession.date} · ${nextSession.start_time || '--:--'} · ${nextSession.focus}`
          : 'no upcoming sessions',
      };
    }

    return {
      clients: clients.map((client) => ({
        id: client.id,
        name: client.name,
        goal: client.goal,
      })),
      todaySessions: todaySchedule,
      activeClientCount,
      clientDataMap,
    };
  });
}

export async function getClientProgress(clientId: string): Promise<ClientProgress> {
  const [measurements, measurementConfigs] = await withDatabaseRecovery(() => Promise.all([
    db.measurements.where('client_id').equals(clientId).sortBy('date'),
    db.measurementConfigs.where('client_id').equals(clientId).sortBy('label'),
  ]));

  const parsedMeasurements = measurements.map(parseMeasurement);

  return {
    measurements: parsedMeasurements,
    measurementConfigs,
    latestMeasurement: parsedMeasurements.length > 0 ? parsedMeasurements[parsedMeasurements.length - 1] || null : null,
  };
}
