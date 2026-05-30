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
let visibilityListenerRefCount = 0;

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

function attachBadgeVisibilityListener(): void {
  if (typeof document === 'undefined') {
    return;
  }

  visibilityListenerRefCount += 1;

  if (visibilityListenerAttached) {
    return;
  }

  syncBadgeAnimationState();
  document.addEventListener('visibilitychange', syncBadgeAnimationState);
  visibilityListenerAttached = true;
}

function detachBadgeVisibilityListener(): void {
  if (typeof document === 'undefined' || visibilityListenerRefCount === 0) {
    return;
  }

  visibilityListenerRefCount -= 1;

  if (visibilityListenerRefCount > 0 || !visibilityListenerAttached) {
    return;
  }

  document.removeEventListener('visibilitychange', syncBadgeAnimationState);
  visibilityListenerAttached = false;
}

export default function Badge({ variant = 'active', label, children }: BadgeProps) {
  useEffect(() => {
    attachBadgeVisibilityListener();

    return () => {
      detachBadgeVisibilityListener();
    };
  }, []);

  return (
    <span className={`badge badge--${variant}`}>
      {variant === 'active' ? <span className="badge__pulse-dot" aria-hidden="true" /> : null}
      {children ?? label ?? BADGE_DEFAULTS[variant]}
    </span>
  );
}
