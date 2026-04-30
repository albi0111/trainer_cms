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
import { getDashboardStats, type DashboardStats } from '../services/dashboardService';

const EMPTY_STATS: DashboardStats = {
  clients: [],
  todaySessions: [],
  activeClientCount: 0,
  clientDataMap: {},
};

export default function DashboardScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      setStats(await getDashboardStats());
    } catch (error) {
      console.error('Failed to load dashboard', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const handleRefresh = () => {
      void loadDashboard();
    };

    window.addEventListener('focus', handleRefresh);
    document.addEventListener('visibilitychange', handleRefresh);
    return () => {
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleRefresh);
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

  return (
    <div className="dashboard-page">
      <TopNavBar 
        rightContent={
          <div className="top-nav-right">
            <span className="nav-date">{currentDateStr}</span>
            <div className="sync-indicator">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.5 19L22 14.5L17.5 10"></path>
                <path d="M2 14.5C2 14.5 5 9.5 12 9.5C19 9.5 22 14.5 22 14.5"></path>
                <path d="M22 14.5C22 14.5 19 19.5 12 19.5C5 19.5 2 14.5 2 14.5Z"></path>
              </svg>
            </div>
          </div>
        }
      />

      <PageWrapper>
        <div className="dashboard-content">
          <header className="dashboard-header">
            <h1 className="greeting">{getGreeting()}, Trainer 👋</h1>
            <p className="date-subtitle">{currentDateStr}</p>
          </header>

          <div className="dashboard-layout">
            <div className="dashboard-layout__sidebar">
              <StatsCards 
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

    </div>
  );
}
