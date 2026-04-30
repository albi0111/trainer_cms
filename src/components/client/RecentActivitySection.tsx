// ─────────────────────────────────────────────────────────────────────────────
// RecentActivitySection — Completed + Missed activity list
// Reference: user screenshots
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import './RecentActivitySection.css';
import Card from '../ui/Card';
import type { SessionActivityEntry } from '../../services/sessionService';

export type ActivityEntry = SessionActivityEntry;

interface RecentActivitySectionProps {
  activities: ActivityEntry[];
  onRevert: (id: string) => void;
}

const MAX_NOTE_LINES = 3;

function ActivityItem({ activity, onRevert }: { activity: ActivityEntry; onRevert: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = activity.status === 'completed';

  const noteText = isCompleted
    ? (activity.performance_notes ?? '')
    : activity.missed_reason && activity.missed_reason !== 'other'
      ? [activity.missed_reason.toUpperCase(), activity.missed_note].filter(Boolean).join(' + ')
      : (activity.missed_note ?? '');

  const noteLines = noteText.split('\n');
  const isTruncatable = noteLines.length > MAX_NOTE_LINES;
  const displayedText = !expanded && isTruncatable
    ? noteLines.slice(0, MAX_NOTE_LINES).join('\n') + '...'
    : noteText;

  const revertIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );

  const checkIcon = (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
  );

  const xIcon = (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
  );

  return (
    <div className="activity-item">
      {/* Status + date */}
      <div className="activity-item__status-row">
        <div className={`activity-status activity-status--${activity.status}`}>
          <div className={`activity-status__dot activity-status__dot--${activity.status}`}>
            {isCompleted ? checkIcon : xIcon}
          </div>
          {activity.status.toUpperCase()}
        </div>
        <span className="activity-item__date">• {activity.date}</span>
      </div>

      {/* Name row + revert button */}
      <div className="activity-item__main-row">
        <div className="activity-item__info">
          <div className="activity-item__name">{activity.focus}</div>
          <div className="activity-item__meta">{activity.start_time} • {activity.duration_minutes}min</div>
        </div>
        
        <div className="activity-item__actions">
          {/* Completed stats pill */}
          {isCompleted && (
            <div className="activity-item__stats-pill">
              <div className="activity-stat">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span className="activity-stat__value">{activity.energy_level ?? 0}/10</span>
              </div>
              <div className="activity-stat">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8l4 4-4 4M6 8l-4 4 4 4M2 12h20" />
                </svg>
                <span className="activity-stat__value">{activity.perceived_difficulty ?? 0}/10</span>
              </div>
            </div>
          )}
          <button className="activity-revert-btn" onClick={onRevert}>{revertIcon}</button>
        </div>
      </div>

      {/* Notes container */}
      {noteText && (
        <div className="activity-item__notes-box">
          <p className="activity-item__notes-text">{displayedText}</p>
          {isTruncatable && (
            <button className="activity-item__see-more" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'See Less' : 'See More'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function RecentActivitySection({
  activities,
  onRevert,
}: RecentActivitySectionProps) {
  const [showAll, setShowAll] = useState(false);

  if (activities.length === 0) return null;

  const displayedActivities = showAll ? activities : activities.slice(0, 2);

  const activityIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
  );

  return (
    <Card padding="md" className="recent-activity-section">
      <div className="card__header">
        <div className="card__header-left">
          <span className="card__header-icon">{activityIcon}</span>
          <span className="card__header-title">RECENT ACTIVITY</span>
        </div>
      </div>

      {displayedActivities.map(a => (
        <ActivityItem key={a.id} activity={a} onRevert={() => onRevert(a.id)} />
      ))}

      {activities.length > 2 && (
        <button className="recent-activity__toggle" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Show Less' : `Show All Activity (${activities.length})`}
        </button>
      )}
    </Card>
  );
}
