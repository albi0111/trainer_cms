// ─────────────────────────────────────────────────────────────────────────────
// SessionsSection — Full session management flow
// Dots → ManageSessionModal → CompleteSessionModal / MarkMissedModal
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import './SessionsSection.css';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import ManageSessionModal from './ManageSessionModal';
import CompleteSessionModal, { type CompleteSessionData } from './CompleteSessionModal';
import MarkMissedModal, { type MarkMissedData } from './MarkMissedModal';
import { Session } from '../../types';
import { toDayName } from '../../services/shared/date';

interface SessionsSectionProps {
  upcoming: Session[];
  pending: Session[];
  onCompleteSession: (id: string, data: CompleteSessionData) => void;
  onMissSession: (id: string, data: MarkMissedData) => void;
  onPostponeSession?: (id: string) => void;
}

type ModalState = 'none' | 'manage' | 'complete' | 'missed';

export default function SessionsSection({
  upcoming,
  pending,
  onCompleteSession,
  onMissSession,
  onPostponeSession,
}: SessionsSectionProps) {
  const [modalState, setModalState] = useState<ModalState>('none');
  const [activeSession, setActiveSession] = useState<Session | null>(null);

  const displayedUpcoming = upcoming.slice(0, 3);

  const dotsIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="5" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="19" r="1.5" fill="currentColor" />
    </svg>
  );

  const openManage = (s: Session) => {
    setActiveSession(s);
    setModalState('manage');
  };

  const closeAll = () => {
    setModalState('none');
    setActiveSession(null);
  };

  const renderItem = (s: Session, isPending: boolean) => (
    <div
      key={s.id}
      className={`session-list-item ${isPending ? 'session-list-item--pending' : ''}`}
      onClick={() => openManage(s)}
      style={{ cursor: 'pointer' }}
    >
      <div className="session-list-item__content">
        <div className="session-list-item__top">
          <span className={`session-list-item__date ${isPending ? 'session-list-item__date--pending' : ''}`}>
            {s.date}
          </span>
          <span className={`session-badge ${isPending ? 'session-badge--pending' : ''}`}>
            {(s.date ? toDayName(s.date) : s.day_name || 'PENDING').toUpperCase()}
          </span>
        </div>
        <p className={`session-list-item__meta ${isPending ? 'session-list-item__meta--pending' : ''}`}>
          {s.start_time || '00:00'} - {s.duration_minutes || 60}min - {s.focus || 'No focus'}
        </p>
      </div>
      <button className="session-dots-btn" onClick={e => { e.stopPropagation(); openManage(s); }}>
        {dotsIcon}
      </button>
    </div>
  );

  return (
    <>
      <Card padding="md" className="sessions-section">
        <div className="card__header">
          <div className="card__header-left">
            <span className="card__header-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6699FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </span>
            <span className="card__header-title">SESSIONS</span>
          </div>
        </div>

        {/* PENDING DATA section */}
        {pending.length > 0 && (
          <div className="sessions-subset">
            <h4 className="sessions-subset__heading">NEEDS LOGGING</h4>
            {pending.map(s => renderItem(s, true))}
          </div>
        )}

        {/* UPCOMING section */}
        <div className="sessions-subset" style={pending.length > 0 ? { marginTop: '24px' } : undefined}>
          <h4 className="sessions-subset__heading">UPCOMING</h4>
          {upcoming.length === 0
            ? <EmptyState message="No upcoming sessions." />
            : displayedUpcoming.map(s => renderItem(s, false))}
        </div>
      </Card>

      {/* ── Manage Session Modal ── */}
      <ManageSessionModal
        visible={modalState === 'manage'}
        onClose={closeAll}
        onMarkComplete={() => setModalState('complete')}
        onPostpone={() => { onPostponeSession?.(activeSession?.id ?? ''); closeAll(); }}
        onMarkMissed={() => setModalState('missed')}
      />

      {/* ── Complete Session Modal ── */}
      <CompleteSessionModal
        visible={modalState === 'complete'}
        sessionFocus={activeSession?.focus}
        onClose={closeAll}
        onConfirm={(data) => {
          if (activeSession) onCompleteSession(activeSession.id, data);
          closeAll();
        }}
      />

      {/* ── Mark Missed Modal ── */}
      <MarkMissedModal
        visible={modalState === 'missed'}
        onClose={closeAll}
        onBack={() => setModalState('manage')}
        onConfirm={(data) => {
          if (activeSession) onMissSession(activeSession.id, data);
          closeAll();
        }}
      />
    </>
  );
}
