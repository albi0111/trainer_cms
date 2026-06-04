import { useCallback, useEffect, useRef } from 'react';
import { useHaptic } from './useHaptic';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
import { useSoundFeedback } from './useSoundFeedback';

type SessionAnimationKind = 'completed' | 'missed';

interface UseSessionCompleteAnimationOptions {
  activityId?: string | null;
}

export interface UseSessionCompleteAnimationResult {
  triggerComplete: () => void;
  triggerMissed: () => void;
}

export interface PendingSessionActivityAnimation {
  activityId: string | null;
  kind: SessionAnimationKind;
  expiresAt: number;
}

export const SESSION_ACTIVITY_ANIMATION_EVENT = 'fp:session-activity-animation-ready';

const ACTIVITY_ANIMATION_TTL_MS = 4000;
const COMPLETE_ACTIVITY_DELAY_MS = 900;
const MISSED_ACTIVITY_DELAY_MS = 680;
const COMPLETE_SOUND_DELAY_MS = 500;
const MISSED_SOUND_DELAY_MS = 420;

let sharedOverlayElement: HTMLDivElement | null = null;
let pendingActivityAnimation: PendingSessionActivityAnimation | null = null;

function clearExpiredPendingAnimation(): void {
  if (!pendingActivityAnimation) {
    return;
  }

  if (pendingActivityAnimation.expiresAt <= Date.now()) {
    pendingActivityAnimation = null;
  }
}

function dispatchActivityAnimationEvent(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.dispatchEvent(new Event(SESSION_ACTIVITY_ANIMATION_EVENT));
  } catch {
    // Silent fail when browser events are unavailable.
  }
}

export function registerSessionAnimationOverlay(element: HTMLDivElement | null): void {
  sharedOverlayElement = element;
}

export function consumePendingSessionActivityAnimation(
  activityId: string,
  status: 'completed' | 'missed',
): PendingSessionActivityAnimation | null {
  clearExpiredPendingAnimation();

  if (!pendingActivityAnimation) {
    return null;
  }

  const idMatches = pendingActivityAnimation.activityId === null || pendingActivityAnimation.activityId === activityId;
  if (!idMatches || pendingActivityAnimation.kind !== status) {
    return null;
  }

  const animation = pendingActivityAnimation;
  pendingActivityAnimation = null;
  return animation;
}

export default function useSessionCompleteAnimation({
  activityId = null,
}: UseSessionCompleteAnimationOptions = {}): UseSessionCompleteAnimationResult {
  const prefersReducedMotion = usePrefersReducedMotion();
  const haptic = useHaptic();
  const { playDelete, playSuccess } = useSoundFeedback();
  const timeoutIdsRef = useRef<number[]>([]);
  const rafIdsRef = useRef<number[]>([]);
  const overlayTouchedRef = useRef(false);

  const clearScheduledWork = useCallback((): void => {
    for (const timeoutId of timeoutIdsRef.current) {
      window.clearTimeout(timeoutId);
    }
    timeoutIdsRef.current = [];

    for (const rafId of rafIdsRef.current) {
      window.cancelAnimationFrame(rafId);
    }
    rafIdsRef.current = [];
  }, []);

  const resetOverlay = useCallback((): void => {
    if (!overlayTouchedRef.current) {
      return;
    }

    const overlay = sharedOverlayElement;
    if (!overlay) {
      overlayTouchedRef.current = false;
      return;
    }

    overlay.style.removeProperty('background');
    overlay.style.removeProperty('opacity');
    overlay.style.removeProperty('transition');
    overlay.style.removeProperty('will-change');
    overlayTouchedRef.current = false;
  }, []);

  const scheduleTimeout = useCallback((callback: () => void, delayMs: number): void => {
    const timeoutId = window.setTimeout(() => {
      timeoutIdsRef.current = timeoutIdsRef.current.filter((entry) => entry !== timeoutId);
      callback();
    }, delayMs);

    timeoutIdsRef.current.push(timeoutId);
  }, []);

  const queuePendingActivityAnimation = useCallback((kind: SessionAnimationKind, delayMs: number): void => {
    scheduleTimeout(() => {
      pendingActivityAnimation = {
        activityId,
        kind,
        expiresAt: Date.now() + ACTIVITY_ANIMATION_TTL_MS,
      };
      dispatchActivityAnimationEvent();

      scheduleTimeout(() => {
        clearExpiredPendingAnimation();
      }, ACTIVITY_ANIMATION_TTL_MS);
    }, delayMs);
  }, [activityId, scheduleTimeout]);

  const pulseOverlay = useCallback((color: string, peakOpacity: number, delayMs: number, totalDurationMs: number): void => {
    if (prefersReducedMotion) {
      return;
    }

    const halfDurationMs = Math.max(Math.round(totalDurationMs / 2), 1);
    const remainingDurationMs = Math.max(totalDurationMs - halfDurationMs, 1);

    scheduleTimeout(() => {
      const overlay = sharedOverlayElement;
      if (!overlay) {
        return;
      }

      overlayTouchedRef.current = true;
      overlay.style.background = color;
      overlay.style.opacity = '0';
      overlay.style.transition = 'none';
      overlay.style.willChange = 'opacity';

      const riseFrameId = window.requestAnimationFrame(() => {
        overlay.style.transition = `opacity ${halfDurationMs}ms ease-in-out`;
        overlay.style.opacity = String(peakOpacity);
      });
      rafIdsRef.current.push(riseFrameId);

      scheduleTimeout(() => {
        overlay.style.transition = `opacity ${remainingDurationMs}ms ease-in-out`;
        overlay.style.opacity = '0';
      }, halfDurationMs);

      scheduleTimeout(() => {
        resetOverlay();
      }, totalDurationMs + 32);
    }, delayMs);
  }, [prefersReducedMotion, resetOverlay, scheduleTimeout]);

  const triggerComplete = useCallback((): void => {
    clearScheduledWork();
    resetOverlay();

    try {
      haptic.success();
    } catch {
      // Silent fail when haptics are unavailable.
    }

    if (prefersReducedMotion) {
      try {
        playSuccess();
      } catch {
        // Silent fail when audio is unavailable.
      }

      queuePendingActivityAnimation('completed', 0);
      return;
    }

    scheduleTimeout(() => {
      try {
        playSuccess();
      } catch {
        // Silent fail when audio is unavailable.
      }
    }, COMPLETE_SOUND_DELAY_MS);

    pulseOverlay('rgba(var(--color-primary-rgb), 1)', 0.07, 400, 300);
    queuePendingActivityAnimation('completed', COMPLETE_ACTIVITY_DELAY_MS);
  }, [clearScheduledWork, haptic, playSuccess, prefersReducedMotion, pulseOverlay, queuePendingActivityAnimation, resetOverlay, scheduleTimeout]);

  const triggerMissed = useCallback((): void => {
    clearScheduledWork();
    resetOverlay();

    try {
      haptic.medium();
    } catch {
      // Silent fail when haptics are unavailable.
    }

    if (prefersReducedMotion) {
      try {
        playDelete();
      } catch {
        // Silent fail when audio is unavailable.
      }

      queuePendingActivityAnimation('missed', 0);
      return;
    }

    scheduleTimeout(() => {
      try {
        playDelete();
      } catch {
        // Silent fail when audio is unavailable.
      }
    }, MISSED_SOUND_DELAY_MS);

    pulseOverlay('rgba(239, 68, 68, 1)', 0.04, 300, 260);
    queuePendingActivityAnimation('missed', MISSED_ACTIVITY_DELAY_MS);
  }, [clearScheduledWork, haptic, playDelete, prefersReducedMotion, pulseOverlay, queuePendingActivityAnimation, resetOverlay, scheduleTimeout]);

  useEffect(() => {
    return () => {
      clearScheduledWork();
      resetOverlay();
    };
  }, [clearScheduledWork, resetOverlay]);

  return {
    triggerComplete,
    triggerMissed,
  };
}
