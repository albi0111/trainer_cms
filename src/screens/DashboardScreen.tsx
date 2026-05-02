import { useCallback, useEffect, useState } from 'react';
import './DashboardScreen.css';
import { useNavigate } from 'react-router-dom';

// UI & Layout Components
import TopNavBar from '../components/layout/TopNavBar';
import PageWrapper from '../components/layout/PageWrapper';

// Dashboard Components
import StatsCards from '../components/dashboard/StatsCards';
import TodaySchedule from '../components/dashboard/TodaySchedule';
import ClientRoster from '../components/dashboard/ClientRoster';
import ClientModal from '../components/modals/ClientModal';
import DriveConnectAlert from '../components/sync/DriveConnectAlert';
import SyncIndicator from '../components/sync/SyncIndicator';
import { type DashboardStats } from '../types';
import { useAppStore } from '../store/useAppStore';

const EMPTY_STATS: DashboardStats = {
  clients: [],
  todaySessions: [],
  activeClientCount: 0,
  clientDataMap: {},
};

export default function DashboardScreen() {
  const navigate = useNavigate();
  const hydrateDashboard = useAppStore((state) => state.hydrateDashboard);
  const runSync = useAppStore((state) => state.runSync);
  const isConnectedToDrive = useAppStore((state) => state.isConnectedToDrive);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [statsAnimationVersion, setStatsAnimationVersion] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDrivePromptOpen, setIsDrivePromptOpen] = useState(false);

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

  useEffect(() => {
    void loadDashboard();
    void runSync().then(loadDashboard).catch(() => undefined);
  }, [loadDashboard, runSync]);

  useEffect(() => {
    const handleWindowFocus = () => {
      void loadDashboard();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadDashboard();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadDashboard]);

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
    if (!isConnectedToDrive) {
      setIsDrivePromptOpen(true);
      return;
    }

    try {
      await runSync();
      await loadDashboard();
    } catch (error) {
      console.error('Failed to sync dashboard data', error);
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
              <StatsCards 
                key={statsAnimationVersion}
                todaySessionCount={stats.todaySessions.length} 
                activeClientCount={stats.activeClientCount} 
              />
              <TodaySchedule sessions={stats.todaySessions} />
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

      <ClientModal 
        open={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadDashboard}
      />

      <DriveConnectAlert
        visible={isDrivePromptOpen}
        onClose={() => setIsDrivePromptOpen(false)}
        onConnected={loadDashboard}
      />

    </div>
  );
}
