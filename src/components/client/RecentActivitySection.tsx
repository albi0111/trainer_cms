// ─────────────────────────────────────────────────────────────────────────────
// RecentActivitySection — Completed + Missed activity list
// Reference: user screenshots
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import './RecentActivitySection.css';
import Card from '../ui/Card';
import useCountUp from '../../hooks/useCountUp';
import {
  consumePendingSessionActivityAnimation,
  SESSION_ACTIVITY_ANIMATION_EVENT,
} from '../../hooks/useSessionCompleteAnimation';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import type { SessionActivityEntry } from '../../services/sessionService';

export type ActivityEntry = SessionActivityEntry;

interface RecentActivitySectionProps {
  activities: ActivityEntry[];
  onRevert: (id: string) => void;
}

const MAX_NOTE_LINES = 3;

function AnimatedActivityStat({
  animationToken,
  delayMs,
  enabled,
  value,
}: {
  animationToken: number;
  delayMs: number;
  enabled: boolean;
  value: number;
}) {
  const { current, isComplete } = useCountUp({
    target: enabled ? value : 0,
    duration: 400,
    delay: delayMs,
    easing: 'ease-out',
  });

  return (
    <span
      className={[
        'activity-stat__value',
        enabled && !isComplete ? 'activity-stat__value--counting' : '',
        enabled && isComplete && value > 0 ? 'activity-stat__value--arrived' : '',
      ].filter(Boolean).join(' ')}
      key={animationToken}
    >
      {enabled ? current : value}/10
    </span>
  );
}

function ActivityItem({
  activity,
  animationKind,
  animationToken,
  onRevert,
  prefersReducedMotion,
}: {
  activity: ActivityEntry;
  animationKind: 'completed' | 'missed' | null;
  animationToken: number | null;
  onRevert: () => void;
  prefersReducedMotion: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = activity.status === 'completed';
  const isAnimated = !prefersReducedMotion && animationKind !== null && animationToken !== null;
  const animateCompletedStats = isAnimated && animationKind === 'completed';
  const animateMissedReason = isAnimated && animationKind === 'missed';

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
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <polyline className="activity-status__stroke" pathLength="100" points="20 6 9 17 4 12" />
    </svg>
  );

  const xIcon = (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
      <line className="activity-status__stroke" pathLength="100" x1="18" y1="6" x2="6" y2="18" />
      <line className="activity-status__stroke" pathLength="100" x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  return (
    <div className={`activity-item${isAnimated ? ` activity-item--intro-${animationKind}` : ''}`}>
      {/* Status + date */}
      <div className="activity-item__status-row">
        <div className={`activity-status activity-status--${activity.status}`}>
          <div
            className={[
              'activity-status__dot',
              `activity-status__dot--${activity.status}`,
              isAnimated ? 'activity-status__dot--animated' : '',
            ].join(' ')}
          >
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
                <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--color-primary)" stroke="var(--color-primary)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                {animateCompletedStats && animationToken !== null ? (
                  <AnimatedActivityStat
                    animationToken={animationToken}
                    delayMs={120}
                    enabled={(activity.energy_level ?? 0) > 0}
                    value={activity.energy_level ?? 0}
                  />
                ) : (
                  <span className="activity-stat__value">{activity.energy_level ?? 0}/10</span>
                )}
              </div>
              <div className="activity-stat">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8l4 4-4 4M6 8l-4 4 4 4M2 12h20" />
                </svg>
                {animateCompletedStats && animationToken !== null ? (
                  <AnimatedActivityStat
                    animationToken={animationToken + 1}
                    delayMs={0}
                    enabled={(activity.perceived_difficulty ?? 0) > 0}
                    value={activity.perceived_difficulty ?? 0}
                  />
                ) : (
                  <span className="activity-stat__value">{activity.perceived_difficulty ?? 0}/10</span>
                )}
              </div>
            </div>
          )}
          <button className="activity-revert-btn" onClick={onRevert} aria-label="Revert session status">{revertIcon}</button>
        </div>
      </div>

      {/* Notes container */}
      {noteText && (
        <div className={`activity-item__notes-box${animateMissedReason ? ' activity-item__notes-box--reason-enter' : ''}`}>
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
  const animationTimeoutRef = useRef<number | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [showAll, setShowAll] = useState(false);
  const [animationEventVersion, setAnimationEventVersion] = useState(0);
  const [animatedActivity, setAnimatedActivity] = useState<{
    id: string;
    kind: 'completed' | 'missed';
    token: number;
  } | null>(null);

  useEffect(() => {
    const handleAnimationReady = () => {
      setAnimationEventVersion((current) => current + 1);
    };

    try {
      window.addEventListener(SESSION_ACTIVITY_ANIMATION_EVENT, handleAnimationReady);
    } catch {
      return;
    }

    return () => {
      window.removeEventListener(SESSION_ACTIVITY_ANIMATION_EVENT, handleAnimationReady);
    };
  }, []);

  useEffect(() => {
    if (animationTimeoutRef.current !== null) {
      window.clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }

    return () => {
      if (animationTimeoutRef.current !== null) {
        window.clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || activities.length === 0) {
      setAnimatedActivity(null);
      return;
    }

    if (animationTimeoutRef.current !== null) {
      window.clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }

    let nextAnimation: { id: string; kind: 'completed' | 'missed'; token: number } | null = null;

    for (const activity of activities) {
      const pendingAnimation = consumePendingSessionActivityAnimation(activity.id, activity.status);
      if (!pendingAnimation) {
        continue;
      }

      nextAnimation = {
        id: activity.id,
        kind: pendingAnimation.kind,
        token: animationEventVersion + Date.now(),
      };
      break;
    }

    if (!nextAnimation) {
      return;
    }

    setAnimatedActivity(nextAnimation);

    animationTimeoutRef.current = window.setTimeout(() => {
      setAnimatedActivity((current) => (current?.id === nextAnimation?.id ? null : current));
      animationTimeoutRef.current = null;
    }, nextAnimation.kind === 'completed' ? 1800 : 1200);
  }, [activities, animationEventVersion, prefersReducedMotion]);

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
        <ActivityItem
          key={a.id}
          activity={a}
          animationKind={animatedActivity?.id === a.id ? animatedActivity.kind : null}
          animationToken={animatedActivity?.id === a.id ? animatedActivity.token : null}
          onRevert={() => onRevert(a.id)}
          prefersReducedMotion={prefersReducedMotion}
        />
      ))}

      {activities.length > 2 && (
        <button className="recent-activity__toggle" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Show Less' : `Show All Activity (${activities.length})`}
        </button>
      )}
    </Card>
  );
}
