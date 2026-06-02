import { useEffect } from 'react';

const KEYBOARD_HEIGHT_VAR = '--keyboard-height';
const VISUAL_VIEWPORT_HEIGHT_VAR = '--app-visible-height';
const VISUAL_VIEWPORT_OFFSET_TOP_VAR = '--app-visible-offset-top';

export function useKeyboardHeight() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const root = document.documentElement;

    const updateViewportMetrics = () => {
      try {
        const viewport = window.visualViewport;
        if (!viewport) {
          root.style.setProperty(KEYBOARD_HEIGHT_VAR, '0px');
          root.style.setProperty(VISUAL_VIEWPORT_HEIGHT_VAR, `${window.innerHeight}px`);
          root.style.setProperty(VISUAL_VIEWPORT_OFFSET_TOP_VAR, '0px');
          return;
        }

        const keyboardHeight = Math.max(0, window.innerHeight - viewport.height);
        root.style.setProperty(KEYBOARD_HEIGHT_VAR, `${keyboardHeight}px`);
        root.style.setProperty(VISUAL_VIEWPORT_HEIGHT_VAR, `${viewport.height}px`);
        root.style.setProperty(VISUAL_VIEWPORT_OFFSET_TOP_VAR, `${viewport.offsetTop}px`);
      } catch {
        root.style.setProperty(KEYBOARD_HEIGHT_VAR, '0px');
        root.style.setProperty(VISUAL_VIEWPORT_HEIGHT_VAR, '100dvh');
        root.style.setProperty(VISUAL_VIEWPORT_OFFSET_TOP_VAR, '0px');
      }
    };

    updateViewportMetrics();

    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', updateViewportMetrics);
    viewport?.addEventListener('scroll', updateViewportMetrics);
    window.addEventListener('resize', updateViewportMetrics);
    window.addEventListener('orientationchange', updateViewportMetrics);

    return () => {
      viewport?.removeEventListener('resize', updateViewportMetrics);
      viewport?.removeEventListener('scroll', updateViewportMetrics);
      window.removeEventListener('resize', updateViewportMetrics);
      window.removeEventListener('orientationchange', updateViewportMetrics);
      root.style.setProperty(KEYBOARD_HEIGHT_VAR, '0px');
      root.style.removeProperty(VISUAL_VIEWPORT_HEIGHT_VAR);
      root.style.removeProperty(VISUAL_VIEWPORT_OFFSET_TOP_VAR);
    };
  }, []);
}
