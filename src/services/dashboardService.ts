import { db } from '../db/db';
import type { ClientStatus, Session } from '../types';
import { deriveClientStatusFromData } from '../utils/clientStatus';
import { getSessionDurationMinutes } from './sessionService';

export interface DashboardClient {
  id: string;
  name: string;
  goal: string;
}

export interface DashboardScheduleItem {
  id: string;
  client_name: string;
  start_time: string;
  focus: string;
  duration_minutes: number;
}

export interface DashboardClientState {
  status: ClientStatus;
  nextSession: string;
}

export interface DashboardStats {
  clients: DashboardClient[];
  todaySessions: DashboardScheduleItem[];
  activeClientCount: number;
  clientDataMap: Record<string, DashboardClientState>;
}

function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sortSessionsByStart(a: Session, b: Session): number {
  return (
    new Date(`${a.date}T${a.start_time || '00:00'}:00`).getTime() -
    new Date(`${b.date}T${b.start_time || '00:00'}:00`).getTime()
  );
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = getLocalDateString(new Date());
  const rawClients = await db.clients
    .filter((client) => client.sync_status !== 'pending_delete')
    .toArray();
  const plans = await db.plans.toArray();
  const sessions = await db.sessions.toArray();

  const clients: DashboardClient[] = rawClients.map((client) => ({
    id: client.id,
    name: client.name,
    goal: client.goal,
  }));

  const todaySessions = sessions
    .filter((session) => session.status === 'planned' && session.date === today)
    .sort(sortSessionsByStart)
    .map((session) => {
      const client = rawClients.find((item) => item.id === session.client_id);
      return {
        id: session.id,
        client_name: client?.name || 'Unknown Client',
        start_time: session.start_time || '--:--',
        focus: session.focus,
        duration_minutes: getSessionDurationMinutes(session),
      };
    });

  const clientDataMap: Record<string, DashboardClientState> = {};
  let activeClientCount = 0;

  rawClients.forEach((client) => {
    const clientSessions = sessions.filter((session) => session.client_id === client.id);
    const clientPlans = plans.filter((plan) => plan.client_id === client.id);
    const status = deriveClientStatusFromData(clientSessions, clientPlans);
    if (status === 'active') {
      activeClientCount += 1;
    }

    const nextSession = clientSessions
      .filter((session) => session.status === 'planned' && session.date >= today)
      .sort(sortSessionsByStart)[0];

    clientDataMap[client.id] = {
      status,
      nextSession: nextSession
        ? `${nextSession.date === today ? 'Today' : nextSession.date} · ${nextSession.start_time || '--:--'} · ${nextSession.focus}`
        : 'no upcoming sessions',
    };
  });

  return {
    clients,
    todaySessions,
    activeClientCount,
    clientDataMap,
  };
}
