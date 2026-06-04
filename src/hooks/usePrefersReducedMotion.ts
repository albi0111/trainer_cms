import { useEffect, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    try {
      const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
      const syncPreference = () => {
        setPrefersReducedMotion(mediaQuery.matches);
      };

      syncPreference();

      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', syncPreference);
      } else {
        mediaQuery.addListener(syncPreference);
      }

      return () => {
        if (typeof mediaQuery.removeEventListener === 'function') {
          mediaQuery.removeEventListener('change', syncPreference);
        } else {
          mediaQuery.removeListener(syncPreference);
        }
      };
    } catch {
      return;
    }
  }, []);

  return prefersReducedMotion;
}
