import { create } from 'zustand';
import type { ClientDetail, DashboardStats, ScheduledSession } from '../types';
import { readGoogleAuthState, type GoogleAuthStatus } from '../services/sync/googleAuth';

export type AppSyncStatus = 'idle' | 'syncing' | 'error';

interface ScheduleCache {
  key: string;
  sessions: ScheduledSession[];
}

interface AppState {
  selectedClientId: string | null;
  isGoogleConnected: boolean;
  googleAuthStatus: GoogleAuthStatus;
  googleAccountEmail: string | null;
  isConnectedToDrive: boolean;
  isCalendarConnected: boolean;
  isCalendarEnabledOnThisDevice: boolean;
  syncStatus: AppSyncStatus;
  calendarSyncStatus: AppSyncStatus;
  googlePendingSyncCount: number;
  pendingSyncCount: number;
  calendarPendingSyncCount: number;
  googleLastSyncedAt: string | null;
  lastSyncedAt: string | null;
  calendarName: string | null;
  calendarLastSyncedAt: string | null;
  googleLastSyncError: string | null;
  lastSyncError: string | null;
  calendarLastSyncError: string | null;
  dashboard: DashboardStats | null;
  clientDetails: Record<string, ClientDetail>;
  scheduleCache: ScheduleCache | null;
  setSelectedClientId: (id: string | null) => void;
  refreshSyncState: () => Promise<void>;
  refreshGoogleState: () => Promise<void>;
  refreshCalendarState: () => Promise<void>;
  hydrateDashboard: () => Promise<DashboardStats>;
  hydrateClientDetail: (clientId: string) => Promise<ClientDetail | null>;
  hydrateSchedule: (startDate: string, endDate: string) => Promise<ScheduledSession[]>;
  connectGoogle: () => Promise<void>;
  disconnectGoogle: () => Promise<void>;
  runGoogleSync: () => Promise<void>;
  connectDrive: () => Promise<void>;
  disconnectDrive: () => Promise<void>;
  connectCalendar: () => Promise<void>;
  disconnectCalendar: () => Promise<void>;
  runSync: () => Promise<void>;
  runCalendarSync: () => Promise<void>;
  invalidateClientDetail: (clientId: string) => void;
  invalidateDashboard: () => void;
}

function readInitialGoogleAuthState(): { isConnected: boolean; authStatus: GoogleAuthStatus } {
  if (typeof window === 'undefined') {
    return { isConnected: false, authStatus: 'revoked' };
  }

  try {
    const state = readGoogleAuthState();
    return {
      isConnected: state.auth_status === 'connected' || state.auth_status === 'expired',
      authStatus: state.auth_status,
    };
  } catch {
    return { isConnected: false, authStatus: 'revoked' };
  }
}

const initialGoogleAuthState = readInitialGoogleAuthState();

export const useAppStore = create<AppState>((set, get) => ({
  selectedClientId: null,
  isGoogleConnected: initialGoogleAuthState.isConnected,
  googleAuthStatus: initialGoogleAuthState.authStatus,
  googleAccountEmail: null,
  isConnectedToDrive: initialGoogleAuthState.isConnected,
  isCalendarConnected: false,
  isCalendarEnabledOnThisDevice: false,
  syncStatus: 'idle',
  calendarSyncStatus: 'idle',
  googlePendingSyncCount: 0,
  pendingSyncCount: 0,
  calendarPendingSyncCount: 0,
  googleLastSyncedAt: null,
  lastSyncedAt: null,
  calendarName: null,
  calendarLastSyncedAt: null,
  googleLastSyncError: null,
  lastSyncError: null,
  calendarLastSyncError: null,
  dashboard: null,
  clientDetails: {},
  scheduleCache: null,

  setSelectedClientId: (id) => set({ selectedClientId: id }),

  refreshSyncState: async () => {
    await get().refreshGoogleState();
  },

  refreshGoogleState: async () => {
    const { getGoogleStatusSnapshot } = await import('../services/google/googleStatusService');
    const snapshot = await getGoogleStatusSnapshot();
    const hasError = Boolean(snapshot.lastError) || snapshot.authStatus === 'failed';
    set({
      isGoogleConnected: snapshot.isConnected,
      googleAuthStatus: snapshot.authStatus,
      googleAccountEmail: snapshot.accountEmail,
      isConnectedToDrive: snapshot.isConnected,
      isCalendarConnected: snapshot.isConnected && Boolean(snapshot.calendarName),
      isCalendarEnabledOnThisDevice: snapshot.calendarEnabledOnThisDevice,
      googlePendingSyncCount: snapshot.pendingCount,
      pendingSyncCount: snapshot.drivePendingCount,
      calendarPendingSyncCount: snapshot.calendarPendingCount,
      googleLastSyncedAt: snapshot.lastSyncedAt,
      lastSyncedAt: snapshot.driveLastSyncedAt,
      calendarLastSyncedAt: snapshot.calendarLastSyncedAt,
      calendarName: snapshot.calendarName,
      googleLastSyncError: snapshot.lastError,
      lastSyncError: snapshot.driveLastError,
      calendarLastSyncError: snapshot.calendarLastError,
      syncStatus: hasError ? 'error' : 'idle',
      calendarSyncStatus: snapshot.calendarLastError ? 'error' : 'idle',
    });
  },

  refreshCalendarState: async () => {
    const { getCalendarSyncSnapshot } = await import('../services/calendar/calendarSyncService');
    const snapshot = await getCalendarSyncSnapshot();
    set({
      isCalendarConnected: snapshot.isConnected,
      isCalendarEnabledOnThisDevice: snapshot.enabledOnThisDevice,
      calendarPendingSyncCount: snapshot.pendingCount,
      calendarName: snapshot.calendarName,
      calendarLastSyncedAt: snapshot.lastSyncAt,
      calendarLastSyncError: snapshot.lastError,
      calendarSyncStatus: snapshot.lastError ? 'error' : 'idle',
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

  connectGoogle: async () => {
    set({ syncStatus: 'syncing', calendarSyncStatus: 'syncing', googleLastSyncError: null });
    try {
      const { connectGoogle } = await import('../services/google/googleConnectionService');
      const result = await connectGoogle();
      if (result.driveChanged || result.calendarChanged) {
        set({
          dashboard: null,
          clientDetails: {},
          scheduleCache: null,
        });
      }
      await get().refreshGoogleState();
      set({
        syncStatus: result.overallStatus === 'success' ? 'idle' : 'error',
        calendarSyncStatus: result.calendarStatus === 'success' ? 'idle' : 'error',
        googleLastSyncError: result.overallStatus === 'success' ? null : 'Google sync partly completed.',
      });
    } catch (error) {
      await get().refreshGoogleState().catch(() => undefined);
      set({
        syncStatus: 'error',
        calendarSyncStatus: 'error',
        googleLastSyncError: error instanceof Error ? error.message : 'Google connection failed.',
      });
    }
  },

  disconnectGoogle: async () => {
    const { disconnectGoogle } = await import('../services/google/googleConnectionService');
    await disconnectGoogle();
    set({
      isGoogleConnected: false,
      googleAuthStatus: 'revoked',
      googleAccountEmail: null,
      isConnectedToDrive: false,
      isCalendarConnected: false,
      isCalendarEnabledOnThisDevice: false,
      syncStatus: 'idle',
      calendarSyncStatus: 'idle',
      googlePendingSyncCount: 0,
      pendingSyncCount: 0,
      calendarPendingSyncCount: 0,
      googleLastSyncedAt: null,
      lastSyncError: null,
      googleLastSyncError: null,
      calendarName: null,
      calendarLastSyncedAt: null,
      calendarLastSyncError: null,
    });
  },

  runGoogleSync: async () => {
    if (get().syncStatus === 'syncing') {
      return;
    }

    if (!get().isGoogleConnected) {
      await get().refreshGoogleState().catch(() => undefined);
      return;
    }

    set({ syncStatus: 'syncing', calendarSyncStatus: 'syncing', googleLastSyncError: null });
    try {
      const { runGoogleSync } = await import('../services/google/googleSyncService');
      const result = await runGoogleSync({ source: 'manual' });
      if (result.driveChanged || result.calendarChanged) {
        set({
          dashboard: null,
          clientDetails: {},
          scheduleCache: null,
        });
      }

      await get().refreshGoogleState();
      set({
        syncStatus: result.overallStatus === 'success' ? 'idle' : 'error',
        calendarSyncStatus: result.calendarStatus === 'success' ? 'idle' : 'error',
        googleLastSyncError: result.overallStatus === 'success'
          ? null
          : result.overallStatus === 'auth_required'
            ? 'Google connection expired. Please reconnect Google.'
            : 'Google sync partly completed.',
      });
    } catch (error) {
      await get().refreshGoogleState().catch(() => undefined);
      set({
        syncStatus: 'error',
        googleLastSyncError: error instanceof Error ? error.message : 'Google sync failed.',
      });
    }
  },

  connectDrive: async () => get().connectGoogle(),

  disconnectDrive: async () => {
    await get().disconnectGoogle();
  },

  connectCalendar: async () => {
    set({ calendarSyncStatus: 'syncing', calendarLastSyncError: null });
    try {
      const [
        { ensureFitPersonaCalendar },
        { planAllPlannedSessions },
        { runCalendarSync },
      ] = await Promise.all([
        import('../services/calendar/calendarSetupService'),
        import('../services/calendar/calendarReminderPlanner'),
        import('../services/calendar/calendarSyncService'),
      ]);
      await ensureFitPersonaCalendar();
      await planAllPlannedSessions();
      await runCalendarSync();
      await get().refreshGoogleState();
      await get().refreshCalendarState();
      set({ calendarSyncStatus: 'idle' });
    } catch (error) {
      await get().refreshGoogleState().catch(() => undefined);
      await get().refreshCalendarState().catch(() => undefined);
      set({
        calendarSyncStatus: 'error',
        calendarLastSyncError: error instanceof Error ? error.message : 'Google Calendar connection failed.',
      });
    }
  },

  disconnectCalendar: async () => {
    const { disconnectFitPersonaCalendar } = await import('../services/calendar/calendarSetupService');
    await disconnectFitPersonaCalendar();
    set({
      isCalendarConnected: false,
      isCalendarEnabledOnThisDevice: false,
      calendarName: null,
      calendarLastSyncedAt: null,
      calendarLastSyncError: null,
      calendarPendingSyncCount: 0,
      calendarSyncStatus: 'idle',
    });
  },

  runSync: async () => get().runGoogleSync(),

  runCalendarSync: async () => {
    set({ calendarSyncStatus: 'syncing', calendarLastSyncError: null });
    try {
      const { ensureValidGoogleAccessToken } = await import('../services/google/googleAuthService');
      await ensureValidGoogleAccessToken();
      const { runCalendarSync } = await import('../services/calendar/calendarSyncService');
      await runCalendarSync();
      await get().refreshCalendarState();
      set({ calendarSyncStatus: 'idle' });
    } catch (error) {
      set({
        calendarSyncStatus: 'error',
        calendarLastSyncError: error instanceof Error ? error.message : 'Google Calendar sync failed.',
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
