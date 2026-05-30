import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEventHandler,
  type TouchEventHandler,
} from 'react';
import { useHaptic } from './useHaptic';
import { useSoundFeedback } from './useSoundFeedback';

const MOVE_TOLERANCE_PX = 10;
const DEFAULT_DURATION_MS = 600;
const PROGRESS_RESET_DELAY_MS = 140;
const SYNTHETIC_MOUSE_GUARD_MS = 750;

type LongPressCallback = () => void;

type Point = {
  x: number;
  y: number;
};

type InputType = 'touch' | 'mouse';

export type LongPressHandlers<T extends HTMLElement = HTMLElement> = {
  onTouchStart: TouchEventHandler<T>;
  onTouchEnd: TouchEventHandler<T>;
  onTouchCancel: TouchEventHandler<T>;
  onMouseDown: MouseEventHandler<T>;
  onMouseUp: MouseEventHandler<T>;
};

interface UseLongPressOptions {
  onLongPress?: LongPressCallback;
  duration?: number;
}

export function useLongPress({ onLongPress, duration = DEFAULT_DURATION_MS }: UseLongPressOptions = {}) {
  const { playTick } = useSoundFeedback();
  const haptic = useHaptic();
  const defaultCallbackRef = useRef<LongPressCallback | undefined>(onLongPress);
  const activeCallbackRef = useRef<LongPressCallback | undefined>(onLongPress);
  const animationFrameRef = useRef<number | null>(null);
  const resetProgressTimeoutRef = useRef<number | null>(null);
  const startTimestampRef = useRef<number | null>(null);
  const startPointRef = useRef<Point | null>(null);
  const activeTouchIdRef = useRef<number | null>(null);
  const activeInputRef = useRef<InputType | null>(null);
  const activePressIdRef = useRef<number | null>(null);
  const pressSequenceRef = useRef(0);
  const lastTouchTimestampRef = useRef(0);
  const triggeredRef = useRef(false);
  const cleanupListenersRef = useRef<() => void>(() => undefined);
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  useEffect(() => {
    defaultCallbackRef.current = onLongPress;
  }, [onLongPress]);

  const clearAnimationFrame = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const clearProgressReset = useCallback(() => {
    if (resetProgressTimeoutRef.current !== null) {
      window.clearTimeout(resetProgressTimeoutRef.current);
      resetProgressTimeoutRef.current = null;
    }
  }, []);

  const resetProgress = useCallback((delayMs = 0) => {
    clearProgressReset();
    resetProgressTimeoutRef.current = window.setTimeout(() => {
      setProgress(0);
      resetProgressTimeoutRef.current = null;
    }, delayMs);
  }, [clearProgressReset]);

  const teardown = useCallback(() => {
    cleanupListenersRef.current();
    cleanupListenersRef.current = () => undefined;
    startPointRef.current = null;
    activeTouchIdRef.current = null;
    activeInputRef.current = null;
    activePressIdRef.current = null;
    startTimestampRef.current = null;
  }, []);

  const cancelLongPressInternal = useCallback((pressId?: number) => {
    if (pressId !== undefined && activePressIdRef.current !== pressId) {
      return;
    }

    clearAnimationFrame();
    teardown();
    setIsHolding(false);
    if (!triggeredRef.current) {
      resetProgress();
    }
  }, [clearAnimationFrame, resetProgress, teardown]);

  const cancelLongPress = useCallback(() => {
    cancelLongPressInternal();
  }, [cancelLongPressInternal]);

  const completeLongPress = useCallback((pressId: number) => {
    if (triggeredRef.current || activePressIdRef.current !== pressId) {
      return;
    }

    triggeredRef.current = true;
    clearAnimationFrame();
    teardown();
    setProgress(1);
    setIsHolding(false);

    try {
      playTick();
      haptic.light();
    } catch {
      // Silent fail when browser APIs are unavailable.
    }

    activeCallbackRef.current?.();
    resetProgress(PROGRESS_RESET_DELAY_MS);
  }, [clearAnimationFrame, haptic, playTick, resetProgress, teardown]);

  const updateProgress = useCallback((pressId: number, timestamp: number) => {
    if (activePressIdRef.current !== pressId) {
      return;
    }

    if (startTimestampRef.current === null) {
      startTimestampRef.current = timestamp;
    }

    const elapsedMs = timestamp - startTimestampRef.current;
    const nextProgress = Math.min(1, elapsedMs / duration);
    setProgress(nextProgress);

    if (nextProgress >= 1) {
      completeLongPress(pressId);
      return;
    }

    animationFrameRef.current = window.requestAnimationFrame((nextTimestamp) => {
      updateProgress(pressId, nextTimestamp);
    });
  }, [completeLongPress, duration]);

  const startPress = useCallback((
    input: InputType,
    callback?: LongPressCallback,
    point?: Point,
    touchId?: number,
  ) => {
    cancelLongPressInternal();

    const pressId = pressSequenceRef.current + 1;
    pressSequenceRef.current = pressId;
    activePressIdRef.current = pressId;
    activeCallbackRef.current = callback ?? defaultCallbackRef.current;
    triggeredRef.current = false;
    activeInputRef.current = input;
    startPointRef.current = point ?? null;
    activeTouchIdRef.current = input === 'touch' ? (touchId ?? null) : null;
    startTimestampRef.current = window.performance.now();

    clearProgressReset();
    setProgress(1 / duration);
    setIsHolding(true);

    animationFrameRef.current = window.requestAnimationFrame((timestamp) => {
      updateProgress(pressId, timestamp);
    });

    return pressId;
  }, [cancelLongPressInternal, clearProgressReset, duration, updateProgress]);

  const bindTouchTracking = useCallback((pressId: number) => {
    const handleTouchMove = (event: TouchEvent) => {
      if (activePressIdRef.current !== pressId) {
        return;
      }

      if (startPointRef.current === null || activeTouchIdRef.current === null) {
        return;
      }

      const touch = Array.from(event.touches).find((item) => item.identifier === activeTouchIdRef.current);
      if (!touch) {
        cancelLongPressInternal(pressId);
        return;
      }

      const deltaX = Math.abs(touch.clientX - startPointRef.current.x);
      const deltaY = Math.abs(touch.clientY - startPointRef.current.y);
      if (deltaX > MOVE_TOLERANCE_PX || deltaY > MOVE_TOLERANCE_PX) {
        cancelLongPressInternal(pressId);
      }
    };

    const handleTouchEnd = () => {
      cancelLongPressInternal(pressId);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    cleanupListenersRef.current = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [cancelLongPressInternal]);

  const bindMouseTracking = useCallback((pressId: number) => {
    const handleMouseUp = () => {
      cancelLongPressInternal(pressId);
    };

    document.addEventListener('mouseup', handleMouseUp);
    cleanupListenersRef.current = () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [cancelLongPressInternal]);

  const createHandlers = useCallback(<T extends HTMLElement>(callback?: LongPressCallback): LongPressHandlers<T> => ({
    onTouchStart: (event) => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      lastTouchTimestampRef.current = window.performance.now();
      const pressId = startPress('touch', callback, { x: touch.clientX, y: touch.clientY }, touch.identifier);
      bindTouchTracking(pressId);
    },
    onTouchEnd: (event) => {
      if (activeInputRef.current !== 'touch') {
        return;
      }

      const activeTouchId = activeTouchIdRef.current;
      if (activeTouchId !== null) {
        const didActiveTouchEnd = Array.from(event.changedTouches).some((touch) => touch.identifier === activeTouchId);
        if (!didActiveTouchEnd) {
          return;
        }
      }

      cancelLongPressInternal();
    },
    onTouchCancel: (event) => {
      if (activeInputRef.current !== 'touch') {
        return;
      }

      const activeTouchId = activeTouchIdRef.current;
      if (activeTouchId !== null) {
        const didActiveTouchCancel = Array.from(event.changedTouches).some((touch) => touch.identifier === activeTouchId);
        if (!didActiveTouchCancel) {
          return;
        }
      }

      cancelLongPressInternal();
    },
    onMouseDown: (event) => {
      if (event.button !== 0) {
        return;
      }

      if ((window.performance.now() - lastTouchTimestampRef.current) < SYNTHETIC_MOUSE_GUARD_MS) {
        return;
      }

      const pressId = startPress('mouse', callback);
      bindMouseTracking(pressId);
    },
    onMouseUp: () => {
      if (activeInputRef.current !== 'mouse') {
        return;
      }

      cancelLongPressInternal();
    },
  }), [bindMouseTracking, bindTouchTracking, cancelLongPressInternal, startPress]);

  const handlers = useMemo(() => createHandlers(), [createHandlers]);

  const consumeLongPress = useCallback(() => {
    if (!triggeredRef.current) {
      return false;
    }

    triggeredRef.current = false;
    return true;
  }, []);

  useEffect(() => () => {
    cancelLongPressInternal();
    clearProgressReset();
  }, [cancelLongPressInternal, clearProgressReset]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelLongPressInternal();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cancelLongPressInternal]);

  return {
    handlers,
    progress,
    isHolding,
    cancelLongPress,
    consumeLongPress,
    getLongPressHandlers: createHandlers,
  };
}
