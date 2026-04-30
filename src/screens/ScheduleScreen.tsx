// ─────────────────────────────────────────────────────────────────────────────
// ScheduleScreen — Calendar grid with session management
// Reference: /reference/components/schedule/
// ─────────────────────────────────────────────────────────────────────────────

import './ScheduleScreen.css';

// UI & Layout Components
import TopNavBar from '../components/layout/TopNavBar';

// Schedule Components
import ScheduleCalendarGrid, { type ScheduledSession } from '../components/schedule/ScheduleCalendarGrid';

// Helper to get ISO date string
const toDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const today = new Date();
const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
const dayAfter = new Date(today); dayAfter.setDate(today.getDate() + 2);

// Mock Data
const MOCK_SESSIONS: ScheduledSession[] = [
  { id: 's1', client_id: 'c1', client_name: 'Ajith Kumar', date: toDateStr(today), start_time: '09:00', duration_minutes: 60, focus: 'Upper Body', type: 'strength', status: 'planned' },
  { id: 's2', client_id: 'c2', client_name: 'Meera Nair', date: toDateStr(today), start_time: '11:00', duration_minutes: 45, focus: 'Legs & Core', type: 'mixed', status: 'planned' },
  { id: 's3', client_id: 'c3', client_name: 'Rahul S', date: toDateStr(today), start_time: '14:00', duration_minutes: 60, focus: 'Full Body', type: 'strength', status: 'planned' },
  { id: 's4', client_id: 'c1', client_name: 'Ajith Kumar', date: toDateStr(tomorrow), start_time: '10:00', duration_minutes: 90, focus: 'Cardio', type: 'cardio', status: 'planned' },
  { id: 's5', client_id: 'c4', client_name: 'Sneha K', date: toDateStr(dayAfter), start_time: '16:00', duration_minutes: 60, focus: 'Mobility', type: 'mobility', status: 'planned' },
];

export default function ScheduleScreen() {
  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="schedule-page">
      <TopNavBar
        showLogo
        showBack={true}
        rightContent={
          <div className="top-nav-right">
            <span className="nav-date">{currentDateStr}</span>
          </div>
        }
      />

      <div className="schedule-content">
        <header className="schedule-header">
          <h1 className="schedule-title">Schedule</h1>
          <p className="schedule-subtitle">{currentDateStr}</p>
        </header>

        <ScheduleCalendarGrid
          sessions={MOCK_SESSIONS}
          activeClientId="c1"
          onSlotPress={(date, hour) => console.log('Slot pressed:', date, hour)}
          onSessionPress={(session) => console.log('Session pressed:', session)}
        />
      </div>

      <button className="schedule-fab" onClick={() => alert('Add Session')}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

    </div>
  );
}
