import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type PointerEventHandler } from 'react';
import { LONG_PRESS_MS, triggerLongPressHaptic } from '../constants/interaction';

const MOVE_TOLERANCE_PX = 10;

type LongPressHandlers<T extends HTMLElement = HTMLElement> = {
  onPointerDown: PointerEventHandler<T>;
  onPointerMove: PointerEventHandler<T>;
  onPointerUp: PointerEventHandler<T>;
  onPointerLeave: PointerEventHandler<T>;
  onPointerCancel: PointerEventHandler<T>;
};

export function useLongPress() {
  const timerRef = useRef<number | null>(null);
  const triggeredRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const cancelLongPress = () => {
    clearTimer();
    startPointRef.current = null;
  };

  const startLongPress = <T extends HTMLElement>(callback: () => void, event: ReactPointerEvent<T>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    clearTimer();
    triggeredRef.current = false;
    startPointRef.current = { x: event.clientX, y: event.clientY };
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      startPointRef.current = null;
      triggeredRef.current = true;
      triggerLongPressHaptic();
      callback();
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = <T extends HTMLElement>(event: ReactPointerEvent<T>) => {
    if (timerRef.current === null || startPointRef.current === null) {
      return;
    }

    const deltaX = Math.abs(event.clientX - startPointRef.current.x);
    const deltaY = Math.abs(event.clientY - startPointRef.current.y);
    if (deltaX > MOVE_TOLERANCE_PX || deltaY > MOVE_TOLERANCE_PX) {
      cancelLongPress();
    }
  };

  const consumeLongPress = (): boolean => {
    if (!triggeredRef.current) {
      return false;
    }

    triggeredRef.current = false;
    return true;
  };

  const getLongPressHandlers = <T extends HTMLElement>(callback: () => void): LongPressHandlers<T> => ({
    onPointerDown: (event) => startLongPress(callback, event),
    onPointerMove: handlePointerMove,
    onPointerUp: cancelLongPress,
    onPointerLeave: cancelLongPress,
    onPointerCancel: cancelLongPress,
  });

  useEffect(() => () => {
    clearTimer();
  }, []);

  return {
    startLongPress,
    handlePointerMove,
    cancelLongPress,
    consumeLongPress,
    getLongPressHandlers,
  };
}
