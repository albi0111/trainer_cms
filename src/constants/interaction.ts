export const LONG_PRESS_MS = 600;
export const LONG_PRESS_VIBRATION_MS = 20;

export function triggerLongPressHaptic(): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(LONG_PRESS_VIBRATION_MS);
  }
}
