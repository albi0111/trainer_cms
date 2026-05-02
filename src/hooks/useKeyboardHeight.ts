import { useEffect } from 'react';

const KEYBOARD_HEIGHT_VAR = '--keyboard-height';

export function useKeyboardHeight() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const root = document.documentElement;

    const updateKeyboardHeight = () => {
      try {
        const viewport = window.visualViewport;
        if (!viewport) {
          root.style.setProperty(KEYBOARD_HEIGHT_VAR, '0px');
          return;
        }

        const keyboardHeight = Math.max(0, window.innerHeight - viewport.height);
        root.style.setProperty(KEYBOARD_HEIGHT_VAR, `${keyboardHeight}px`);
      } catch {
        root.style.setProperty(KEYBOARD_HEIGHT_VAR, '0px');
      }
    };

    updateKeyboardHeight();

    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', updateKeyboardHeight);
    window.addEventListener('resize', updateKeyboardHeight);

    return () => {
      viewport?.removeEventListener('resize', updateKeyboardHeight);
      window.removeEventListener('resize', updateKeyboardHeight);
      root.style.setProperty(KEYBOARD_HEIGHT_VAR, '0px');
    };
  }, []);
}
