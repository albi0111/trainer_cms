type HapticPattern = number | number[];

function vibrate(pattern: HapticPattern): void {
  try {
    if (typeof navigator === 'undefined') {
      return;
    }

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isAndroid = /android/i.test(navigator.userAgent);
    if (isIOS || !isAndroid || typeof navigator.vibrate !== 'function') {
      return;
    }

    navigator.vibrate(pattern);
  } catch {
    // Silent fail when vibration is blocked or unavailable.
  }
}

export function useHaptic() {
  const light = () => vibrate(8);
  const medium = () => vibrate(15);
  const success = () => vibrate([10, 50, 10]);
  const error = () => vibrate(300);

  return { light, medium, success, error };
}
