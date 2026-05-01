import { useEffect, useRef, type PointerEventHandler } from 'react';
import { LONG_PRESS_MS, triggerLongPressHaptic } from '../constants/interaction';

type LongPressHandlers<T extends HTMLElement = HTMLElement> = {
  onPointerDown: PointerEventHandler<T>;
  onPointerUp: PointerEventHandler<T>;
  onPointerLeave: PointerEventHandler<T>;
  onPointerCancel: PointerEventHandler<T>;
};

export function useLongPress() {
  const timerRef = useRef<number | null>(null);
  const triggeredRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const cancelLongPress = () => {
    clearTimer();
  };

  const startLongPress = (callback: () => void) => {
    clearTimer();
    triggeredRef.current = false;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      triggeredRef.current = true;
      triggerLongPressHaptic();
      callback();
    }, LONG_PRESS_MS);
  };

  const consumeLongPress = (): boolean => {
    if (!triggeredRef.current) {
      return false;
    }

    triggeredRef.current = false;
    return true;
  };

  const getLongPressHandlers = <T extends HTMLElement>(callback: () => void): LongPressHandlers<T> => ({
    onPointerDown: () => startLongPress(callback),
    onPointerUp: cancelLongPress,
    onPointerLeave: cancelLongPress,
    onPointerCancel: cancelLongPress,
  });

  useEffect(() => () => {
    clearTimer();
  }, []);

  return {
    startLongPress,
    cancelLongPress,
    consumeLongPress,
    getLongPressHandlers,
  };
}
