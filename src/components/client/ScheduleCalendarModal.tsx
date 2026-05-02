import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ScheduleCalendarModal.css';
import type { ScheduledSession, Session } from '../../types';
import ScheduleCalendarGrid from '../schedule/ScheduleCalendarGrid';
import AppAlert from '../shared/AppAlert';

interface ScheduleCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  weekPlan: any;
  sessions: ScheduledSession[];
  activeClientId: string;
  onSlotClick: (date: string, time: string) => void;
  onSessionClick: (session: Session) => void;
  onGoalChange: (goal: string) => void;
  onDeleteSession: (sessionId: string) => Promise<void> | void;
  onPasteSession: (date: string, hour: number, sourceId: string) => Promise<void> | void;
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
  onDeleteSession,
  onPasteSession,
}: ScheduleCalendarModalProps) {
  const [displayWeekPlan, setDisplayWeekPlan] = useState(weekPlan);
  const [goal, setGoal] = useState(weekPlan?.goal || '');
  const [sessionToDelete, setSessionToDelete] = useState<ScheduledSession | null>(null);
  const [isOpening, setIsOpening] = useState(false);

  useEffect(() => {
    if (weekPlan) {
      setDisplayWeekPlan(weekPlan);
      setGoal(weekPlan.goal || '');
    }
  }, [weekPlan]);

  useEffect(() => {
    if (!visible) {
      setIsOpening(false);
      return;
    }

    setIsOpening(true);
    const timeout = window.setTimeout(() => {
      setIsOpening(false);
    }, 200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [visible]);

  if (!displayWeekPlan) return null;

  return createPortal(
    <div
      className="uc-overlay schedule-calendar-modal__overlay"
      data-state={visible ? 'open' : 'closed'}
      data-opening={isOpening ? 'true' : 'false'}
      onClick={onClose}
    >
      <div className="uc-modal schedule-calendar-modal__dialog" onClick={e => e.stopPropagation()}>
        <div className="uc-header schedule-calendar-modal__header">
          <div className="schedule-calendar-modal__intro">
            <h2 className="uc-title schedule-calendar-modal__title">{displayWeekPlan.title}</h2>
            <p className="uc-subtitle schedule-calendar-modal__subtitle">Select a slot to schedule a workout</p>
          </div>
          <div className="schedule-calendar-modal__controls">
            <div className="schedule-calendar-modal__goal-shell">
              <input 
                className="schedule-calendar-modal__goal-input"
                type="text" 
                value={goal}
                onChange={e => setGoal(e.target.value)}
                onBlur={() => onGoalChange(goal)}
                placeholder="Goal / Focus"
              />
            </div>
            <button className="uc-close-btn schedule-calendar-modal__close" onClick={onClose}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <div className="schedule-calendar-modal__body">
          <ScheduleCalendarGrid
            sessions={sessions}
            activeClientId={activeClientId}
            onSlotPress={(date, hour) => {
              const timeStr = `${hour.toString().padStart(2, '0')}:00`;
              onSlotClick(date, timeStr);
            }}
            onSessionPress={(scheduled) => {
              const original = sessions.find((session) => session.id === scheduled.id);
              if (original) {
                onSessionClick(original);
              }
            }}
            onDeleteSession={(id) => {
              const s = sessions.find(sess => sess.id === id);
              if (s) setSessionToDelete(s);
            }}
            onPasteSession={onPasteSession}
          />
        </div>
      </div>

      <AppAlert
        visible={!!sessionToDelete}
        title="Delete Session"
        message="Are you sure you want to delete this session? This will remove all exercises and tracked sets."
        onConfirm={async () => {
          if (sessionToDelete) {
            await onDeleteSession(sessionToDelete.id);
            setSessionToDelete(null);
          }
        }}
        onCancel={() => setSessionToDelete(null)}
      />
    </div>,
    document.body
  );
}
