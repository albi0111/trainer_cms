import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ScheduleCalendarModal.css';
import { Session } from '../../types';
import ScheduleCalendarGrid, { ScheduledSession } from '../schedule/ScheduleCalendarGrid';
import { db } from '../../db/db';
import AppAlert from '../shared/AppAlert';

interface ScheduleCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  weekPlan: any;
  sessions: Session[];
  activeClientId: string;
  onSlotClick: (date: string, time: string) => void;
  onSessionClick: (session: Session) => void;
  onGoalChange: (goal: string) => void;
}

export default function ScheduleCalendarModal({
  visible,
  onClose,
  weekPlan,
  sessions,
  activeClientId,
  onSlotClick,
  onSessionClick,
  onGoalChange,
  onPlansChange
}: ScheduleCalendarModalProps & { onPlansChange: () => void }) {
  const [goal, setGoal] = useState(weekPlan?.goal || '');
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);

  useEffect(() => {
    if (weekPlan) {
      setGoal(weekPlan.goal || '');
    }
  }, [weekPlan]);

  if (!visible || !weekPlan) return null;

  // Map sessions to ScheduledSession format for the grid
  const mappedSessions: ScheduledSession[] = sessions.map(s => ({
    id: s.id || Math.random().toString(),
    client_id: s.client_id || '',
    client_name: s.client_id === activeClientId ? 'OWN' : 'OTHER',
    date: s.date || '',
    start_time: s.start_time,
    end_time: s.end_time,
    duration_minutes: s.duration_minutes,
    focus: s.focus || '',
    type: s.type,
    status: s.status
  }));

  return createPortal(
    <div className="uc-overlay" onClick={onClose} style={{ zIndex: 100 }}>
      <div className="uc-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '1000px', width: '96%', height: '94%', maxHeight: '96%', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '24px' }}>
        
        {/* Match Image 2 Header Design */}
        <div className="uc-header" style={{ alignItems: 'center', padding: '32px 32px 12px', borderBottom: 'none', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ flex: '1 1 300px' }}>
            <h2 className="uc-title" style={{ margin: 0, fontSize: '22px' }}>{weekPlan.title}</h2>
            <p className="uc-subtitle" style={{ color: '#888', margin: '4px 0 0', textTransform: 'none', fontSize: '11px' }}>Select a slot to schedule a workout</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: '1 1 auto', justifyContent: 'flex-end' }}>
            <div style={{ border: '1px solid #333', borderRadius: '12px', padding: '0 16px', width: '100%', maxWidth: '280px', display: 'flex', alignItems: 'center', backgroundColor: '#161616' }}>
              <input 
                type="text" 
                value={goal}
                onChange={e => setGoal(e.target.value)}
                onBlur={() => onGoalChange(goal)}
                placeholder="Goal / Focus"
                style={{ background: 'transparent', border: 'none', color: '#FFF', outline: 'none', width: '100%', padding: '10px 0', fontSize: '13px' }}
              />
            </div>
            <button className="uc-close-btn" onClick={onClose} style={{ borderRadius: '50%', background: '#1A1A1A', width: '32px', height: '32px', minWidth: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #333', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ScheduleCalendarGrid
            sessions={mappedSessions}
            activeClientId={activeClientId}
            onSlotPress={(date, hour) => {
              const timeStr = `${hour.toString().padStart(2, '0')}:00`;
              onSlotClick(date, timeStr);
            }}
            onSessionPress={(scheduled) => {
              const original = sessions.find(s => s.id === scheduled.id);
              if (original) onSessionClick(original);
            }}
            onDeleteSession={(id) => {
              const s = sessions.find(sess => sess.id === id);
              if (s) setSessionToDelete(s);
            }}
            onPasteSession={async (date, hour, sourceId) => {
              const source = sessions.find(s => s.id === sourceId);
              if (!source) return;

              const hourStr = `${hour.toString().padStart(2, '0')}:00`;
              const hourNum = hour * 100;
              
              // Overlap check
              const isOverlapping = sessions.some(s => {
                if (s.date !== date) return false;
                const sStart = parseInt((s.start_time || '00:00').replace(':', ''));
                const sEnd = parseInt((s.end_time || '00:00').replace(':', ''));
                return (hourNum >= sStart && hourNum < sEnd);
              });

              if (isOverlapping) {
                alert('This slot is already occupied. Please choose another time.');
                return;
              }

              // Duplicate session
              const newId = 's' + Date.now();
              const now = new Date().toISOString();
              await db.sessions.put({
                ...source,
                id: newId,
                date,
                start_time: hourStr,
                end_time: `${((hour + 1) % 24).toString().padStart(2, '0')}:00`,
                created_at: now,
                updated_at: now
              });

              // Duplicate exercises
              const exs = await db.exercises.where('session_id').equals(source.id!).toArray();
              for (const ex of exs) {
                await db.exercises.put({
                  ...ex,
                  id: 'e' + Date.now() + Math.random(),
                  session_id: newId,
                  created_at: now
                });
              }

              onPlansChange();
            }}
            scrollToDate={weekPlan.start_date}
          />
        </div>
      </div>

      <AppAlert
        visible={!!sessionToDelete}
        title="Delete Session"
        message="Are you sure you want to delete this session? This will remove all exercises and tracked sets."
        onConfirm={async () => {
          if (sessionToDelete) {
            await db.sessions.delete(sessionToDelete.id);
            await db.exercises.where('session_id').equals(sessionToDelete.id!).delete();
            setSessionToDelete(null);
            onPlansChange();
          }
        }}
        onCancel={() => setSessionToDelete(null)}
      />
    </div>,
    document.body
  );
}
