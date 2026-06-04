import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ScheduleScreen.css';

import TopNavBar from '../components/layout/TopNavBar';
import PageWrapper from '../components/layout/PageWrapper';
import ScheduleCalendarGrid from '../components/schedule/ScheduleCalendarGrid';
import { getCurrentMonthRange } from '../services/shared/date';
import { useAppStore } from '../store/useAppStore';

export default function ScheduleScreen() {
  const navigate = useNavigate();
  const hydrateSchedule = useAppStore((state) => state.hydrateSchedule);
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof hydrateSchedule>>>([]);

  const currentDateStr = useMemo(() => new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }), []);

  useEffect(() => {
    const range = getCurrentMonthRange();
    void hydrateSchedule(range.startDate, range.endDate).then(setSessions);
  }, [hydrateSchedule]);

  return (
    <div className="schedule-page">
      <TopNavBar
        showLogo
        showBack
        rightContent={(
          <div className="top-nav-right">
            <span className="nav-date">{currentDateStr}</span>
          </div>
        )}
      />

      <PageWrapper>
        <div className="schedule-content">
          <header className="schedule-header">
            <h1 className="schedule-title">Schedule</h1>
            <p className="schedule-subtitle">{currentDateStr}</p>
          </header>

          <ScheduleCalendarGrid
            sessions={sessions}
            onSlotPress={() => undefined}
            onSessionPress={(session) => navigate(`/client/${session.client_id}`)}
          />
        </div>
      </PageWrapper>
    </div>
  );
}
