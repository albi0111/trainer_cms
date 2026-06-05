import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import './DashboardScreen.css';
import { useNavigate } from 'react-router-dom';

// UI & Layout Components
import TopNavBar from '../components/layout/TopNavBar';
import PageWrapper from '../components/layout/PageWrapper';

// Dashboard Components
import StatsCards from '../components/dashboard/StatsCards';
import TodaySchedule from '../components/dashboard/TodaySchedule';
import ClientRoster from '../components/dashboard/ClientRoster';
import SkeletonScheduleCard from '../components/skeletons/SkeletonScheduleCard';
import SkeletonStatCard from '../components/skeletons/SkeletonStatCard';
import SyncIndicator from '../components/sync/SyncIndicator';
import { type DashboardStats } from '../types';
import { useAppStore } from '../store/useAppStore';

const ClientModal = lazy(() => import('../components/modals/ClientModal'));
const DriveConnectAlert = lazy(() => import('../components/sync/DriveConnectAlert'));

const EMPTY_STATS: DashboardStats = {
  clients: [],
  todaySessions: [],
  activeClientCount: 0,
  clientDataMap: {},
};

export default function DashboardScreen() {
  const navigate = useNavigate();
  const hydrateDashboard = useAppStore((state) => state.hydrateDashboard);
  const invalidateDashboard = useAppStore((state) => state.invalidateDashboard);
  const runSync = useAppStore((state) => state.runSync);
  const isGoogleConnected = useAppStore((state) => state.isGoogleConnected);
  const googleAuthStatus = useAppStore((state) => state.googleAuthStatus);
  const syncStatus = useAppStore((state) => state.syncStatus);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [statsAnimationVersion, setStatsAnimationVersion] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDrivePromptOpen, setIsDrivePromptOpen] = useState(false);
  const [showLoadingSkeleton, setShowLoadingSkeleton] = useState(false);
  const [hasLoadedAddModal, setHasLoadedAddModal] = useState(false);
  const [hasLoadedDrivePrompt, setHasLoadedDrivePrompt] = useState(false);
  const hasLoadedDashboardRef = useRef(false);
  const isForegroundRefreshRunningRef = useRef(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      setStats(await hydrateDashboard());
      setStatsAnimationVersion((current) => current + 1);
    } catch (error) {
      console.error('Failed to load dashboard', error);
    } finally {
      setLoading(false);
    }
  }, [hydrateDashboard]);

  const reloadDashboard = useCallback(async () => {
    invalidateDashboard();
    await loadDashboard();
  }, [invalidateDashboard, loadDashboard]);

  const syncAndLoadDashboard = useCallback(async () => {
    if (isForegroundRefreshRunningRef.current) {
      return;
    }

    isForegroundRefreshRunningRef.current = true;

    try {
      if (isGoogleConnected) {
        try {
          await runSync();
        } catch (error) {
          console.error('Failed to sync dashboard data', error);
        }
      }

      await loadDashboard();
    } finally {
      isForegroundRefreshRunningRef.current = false;
    }
  }, [isGoogleConnected, loadDashboard, runSync]);

  useEffect(() => {
    void loadDashboard();
    if (isGoogleConnected) {
      void runSync().then(loadDashboard).catch(() => undefined);
    }
  }, [isGoogleConnected, loadDashboard, runSync]);

  useEffect(() => {
    if (hasLoadedDashboardRef.current || !loading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowLoadingSkeleton(true);
    }, 150);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loading]);

  useEffect(() => {
    if (loading) {
      return;
    }

    hasLoadedDashboardRef.current = true;

    if (!showLoadingSkeleton) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowLoadingSkeleton(false);
    }, 200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loading, showLoadingSkeleton]);

  useEffect(() => {
    if (isAddModalOpen) {
      setHasLoadedAddModal(true);
    }
  }, [isAddModalOpen]);

  useEffect(() => {
    if (isDrivePromptOpen) {
      setHasLoadedDrivePrompt(true);
    }
  }, [isDrivePromptOpen]);

  useEffect(() => {
    const handleWindowFocus = () => {
      void syncAndLoadDashboard();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncAndLoadDashboard();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncAndLoadDashboard]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const currentDateStr = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  const handleSyncIndicatorPress = async () => {
    if (
      !isGoogleConnected
      || googleAuthStatus === 'expired'
      || googleAuthStatus === 'revoked'
      || googleAuthStatus === 'failed'
    ) {
      setIsDrivePromptOpen(true);
      return;
    }

    if (syncStatus === 'syncing') {
      return;
    }

    try {
      await runSync();
      await loadDashboard();
    } catch (error) {
      console.error('Failed to sync Google data', error);
    }
  };

  return (
    <div className="dashboard-page">
      <TopNavBar 
        rightContent={
          <div className="top-nav-right">
            <div className="sync-indicator">
              <SyncIndicator
                compact
                onClick={() => void handleSyncIndicatorPress()}
                onLongPress={() => navigate('/settings')}
              />
            </div>
          </div>
        }
      />

      <PageWrapper>
        <div className="dashboard-content">
          <header className="dashboard-header">
            <h1 className="greeting">{getGreeting()}, Ajith 👋</h1>
            <p className="date-subtitle">{currentDateStr}</p>
          </header>

          <div className="dashboard-layout">
            <div className="dashboard-layout__sidebar">
              <div className="dashboard-content-stack">
                <div
                  className="dashboard-content-stack__content"
                  style={{
                    opacity: loading && !hasLoadedDashboardRef.current ? 0 : 1,
                    transform: loading && !hasLoadedDashboardRef.current ? 'translate3d(0, 6px, 0)' : 'translate3d(0, 0, 0)',
                    transition: 'opacity 200ms ease-out, transform 200ms ease-out',
                  }}
                >
                  <StatsCards
                    key={statsAnimationVersion}
                    todaySessionCount={stats.todaySessions.length}
                    activeClientCount={stats.activeClientCount}
                  />
                  <TodaySchedule sessions={stats.todaySessions} />
                </div>

                {showLoadingSkeleton ? (
                  <div
                    className="dashboard-content-stack__skeleton"
                    style={{ opacity: loading ? 1 : 0 }}
                    aria-hidden="true"
                  >
                    <div className="stats-row">
                      <SkeletonStatCard />
                      <SkeletonStatCard />
                    </div>
                    <SkeletonScheduleCard />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="dashboard-layout__main">
              <ClientRoster 
                clients={stats.clients}
                clientDataMap={stats.clientDataMap}
                loading={loading}
                onClientPress={(id) => navigate(`/client/${id}`)}
                onAddClient={() => setIsAddModalOpen(true)}
              />
            </div>
          </div>
        </div>
      </PageWrapper>

      {hasLoadedAddModal ? (
        <Suspense fallback={null}>
          <ClientModal
            open={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSuccess={() => {
              void reloadDashboard();
            }}
          />
        </Suspense>
      ) : null}

      {hasLoadedDrivePrompt ? (
        <Suspense fallback={null}>
          <DriveConnectAlert
            visible={isDrivePromptOpen}
            onClose={() => setIsDrivePromptOpen(false)}
          />
        </Suspense>
      ) : null}

    </div>
  );
}
