import { useEffect } from 'react';
import './Badge.css';

export type BadgeVariant = 'active' | 'completed' | 'on-hold' | 'pending';

interface BadgeProps {
  variant?: BadgeVariant;
  label?: string;
  children?: React.ReactNode;
}

const BADGE_DEFAULTS: Record<BadgeVariant, string> = {
  active: 'Active',
  completed: 'Completed',
  'on-hold': 'On Hold',
  pending: 'Pending',
};

let visibilityListenerAttached = false;

function syncBadgeAnimationState(): void {
  if (typeof document === 'undefined') {
    return;
  }

  try {
    document.documentElement.style.setProperty(
      '--fp-active-badge-play-state',
      document.hidden ? 'paused' : 'running',
    );
  } catch {
    // Silent fail when document is unavailable.
  }
}

function ensureBadgeVisibilityListener(): void {
  if (visibilityListenerAttached || typeof document === 'undefined') {
    return;
  }

  syncBadgeAnimationState();
  document.addEventListener('visibilitychange', syncBadgeAnimationState);
  visibilityListenerAttached = true;
}

export default function Badge({ variant = 'active', label, children }: BadgeProps) {
  useEffect(() => {
    ensureBadgeVisibilityListener();
  }, []);

  return (
    <span className={`badge badge--${variant}`}>
      {variant === 'active' ? <span className="badge__pulse-dot" aria-hidden="true" /> : null}
      {children ?? label ?? BADGE_DEFAULTS[variant]}
    </span>
  );
}
