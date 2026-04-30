import './TodaySchedule.css';
import Avatar from '../ui/Avatar';

interface Session {
  id: string;
  client_name: string;
  start_time: string;
  focus: string;
  duration_minutes: number;
}

interface TodayScheduleProps {
  sessions: Session[];
}

export default function TodaySchedule({ sessions }: TodayScheduleProps) {
  return (
    <div className="today-schedule">
      <div className="today-schedule__header">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--color-primary)' }}>
          <path d="M9 1L1 9H6L5 15L13 7H8L9 1Z" fill="currentColor" />
        </svg>
        <h3 className="today-schedule__title">TODAY'S SCHEDULE</h3>
      </div>
      
      {sessions.length === 0 ? (
        <div className="today-schedule__empty">
          <p className="today-schedule__empty-text">No sessions today</p>
        </div>
      ) : (
        <div className="today-schedule__list">
          {sessions.map((s) => (
            <div key={s.id} className="schedule-item">
              <Avatar name={s.client_name} size="md" />
              <div className="schedule-item__info">
                <h4 className="schedule-item__name">{s.client_name}</h4>
                <p className="schedule-item__meta">
                  {s.start_time || '--:--'} · {s.focus} · {s.duration_minutes || 60}min
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
