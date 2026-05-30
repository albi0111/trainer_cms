import { create } from 'zustand';
import type { ClientDetail, DashboardStats, ScheduledSession } from '../types';

export type AppSyncStatus = 'idle' | 'syncing' | 'error';

interface ScheduleCache {
  key: string;
  sessions: ScheduledSession[];
}

interface AppState {
  selectedClientId: string | null;
  isConnectedToDrive: boolean;
  syncStatus: AppSyncStatus;
  pendingSyncCount: number;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  dashboard: DashboardStats | null;
  clientDetails: Record<string, ClientDetail>;
  scheduleCache: ScheduleCache | null;
  setSelectedClientId: (id: string | null) => void;
  refreshSyncState: () => Promise<void>;
  hydrateDashboard: () => Promise<DashboardStats>;
  hydrateClientDetail: (clientId: string) => Promise<ClientDetail | null>;
  hydrateSchedule: (startDate: string, endDate: string) => Promise<ScheduledSession[]>;
  connectDrive: () => Promise<void>;
  disconnectDrive: () => Promise<void>;
  runSync: () => Promise<void>;
  invalidateClientDetail: (clientId: string) => void;
  invalidateDashboard: () => void;
}

const DRIVE_TOKEN_KEY = 'fitpersona.google.access_token';
const DRIVE_EXPIRES_KEY = 'fitpersona.google.expires_at';

function readInitialDriveAuthState(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const token = localStorage.getItem(DRIVE_TOKEN_KEY);
    const expiresAt = Number(localStorage.getItem(DRIVE_EXPIRES_KEY) || '0');

    if (!token || !expiresAt || Date.now() >= expiresAt) {
      if (token || expiresAt) {
        localStorage.removeItem(DRIVE_TOKEN_KEY);
        localStorage.removeItem(DRIVE_EXPIRES_KEY);
      }
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  selectedClientId: null,
  isConnectedToDrive: readInitialDriveAuthState(),
  syncStatus: 'idle',
  pendingSyncCount: 0,
  lastSyncedAt: null,
  lastSyncError: null,
  dashboard: null,
  clientDetails: {},
  scheduleCache: null,

  setSelectedClientId: (id) => set({ selectedClientId: id }),

  refreshSyncState: async () => {
    const [{ getSyncSnapshot }, { isAuthenticated }] = await Promise.all([
      import('../services/sync/syncService'),
      import('../services/sync/googleAuth'),
    ]);
    const snapshot = await getSyncSnapshot();
    const authenticated = isAuthenticated();
    set({
      isConnectedToDrive: authenticated,
      pendingSyncCount: snapshot.pendingCount,
      lastSyncedAt: snapshot.lastSyncAt || null,
      lastSyncError: snapshot.lastError || null,
      syncStatus: authenticated && !snapshot.lastError ? 'idle' : snapshot.lastError ? 'error' : 'idle',
    });
  },

  hydrateDashboard: async () => {
    const cachedDashboard = get().dashboard;
    if (cachedDashboard) {
      return cachedDashboard;
    }

    const { getDashboardStats } = await import('../services/analytics/analyticsService');
    const dashboard = await getDashboardStats();
    set({ dashboard });
    return dashboard;
  },

  hydrateClientDetail: async (clientId: string) => {
    const cachedDetail = get().clientDetails[clientId];
    if (cachedDetail) {
      return cachedDetail;
    }

    const { getClientDetail } = await import('../services/client/clientService');
    const detail = await getClientDetail(clientId);
    if (detail) {
      set((state) => ({
        clientDetails: {
          ...state.clientDetails,
          [clientId]: detail,
        },
      }));
    }
    return detail;
  },

  hydrateSchedule: async (startDate: string, endDate: string) => {
    const key = `${startDate}:${endDate}`;
    const cached = get().scheduleCache;
    if (cached?.key === key) {
      return cached.sessions;
    }

    const { getMonthSchedule } = await import('../services/schedule/scheduleService');
    const sessions = await getMonthSchedule(startDate, endDate);
    set({ scheduleCache: { key, sessions } });
    return sessions;
  },

  connectDrive: async () => {
    const { signIn } = await import('../services/sync/googleAuth');
    await signIn();
    set({ isConnectedToDrive: true });
    await get().runSync();
    await get().refreshSyncState();
  },

  disconnectDrive: async () => {
    const { signOut } = await import('../services/sync/googleAuth');
    await signOut();
    set({
      isConnectedToDrive: false,
      syncStatus: 'idle',
      pendingSyncCount: 0,
      lastSyncError: null,
    });
  },

  runSync: async () => {
    set({ syncStatus: 'syncing' });
    try {
      const { runSyncCycle } = await import('../services/sync/syncService');
      const changed = await runSyncCycle();
      if (changed) {
        set({
          dashboard: null,
          clientDetails: {},
          scheduleCache: null,
        });
      }
      await get().refreshSyncState();
      set({ syncStatus: 'idle' });
    } catch (error) {
      set({
        syncStatus: 'error',
        lastSyncError: error instanceof Error ? error.message : 'Sync failed.',
      });
    }
  },

  invalidateClientDetail: (clientId: string) => set((state) => {
    const nextDetails = { ...state.clientDetails };
    delete nextDetails[clientId];
    return { clientDetails: nextDetails, scheduleCache: null };
  }),

  invalidateDashboard: () => set({ dashboard: null, scheduleCache: null }),
}));
