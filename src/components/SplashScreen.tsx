import { useEffect, useMemo, useRef, useState } from 'react';
import pkg from '../../package.json';

interface SplashScreenProps {
  onComplete: () => void;
}

const APP_READY_EVENT = 'fp:app-ready';
const SPLASH_FADE_START_MS = 1500;
const SPLASH_VISIBLE_MS = 1800;
const SPLASH_FADE_DURATION_MS = 300;

type GlobalWindowState = Window & {
  __fpAppReady?: boolean;
};

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isAppReady, setIsAppReady] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return Boolean((window as GlobalWindowState).__fpAppReady);
  });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const mountTimeRef = useRef<number>(typeof performance !== 'undefined' ? performance.now() : 0);
  const fadeStartedRef = useRef(false);
  const completionTriggeredRef = useRef(false);
  const version = useMemo(() => (
    typeof pkg.version === 'string' && pkg.version.trim() ? pkg.version : '1.0.0'
  ), []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    try {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleAppReady = () => {
      setIsAppReady(true);
    };

    window.addEventListener(APP_READY_EVENT, handleAppReady);

    if ((window as GlobalWindowState).__fpAppReady) {
      setIsAppReady(true);
    }

    return () => {
      window.removeEventListener(APP_READY_EVENT, handleAppReady);
    };
  }, []);

  useEffect(() => {
    if (!isAppReady || completionTriggeredRef.current) {
      return;
    }

    let fadeTimeoutId: number | null = null;
    let completionTimeoutId: number | null = null;
    const elapsed = Math.max((typeof performance !== 'undefined' ? performance.now() : 0) - mountTimeRef.current, 0);

    if (prefersReducedMotion) {
      const completionDelay = Math.max(SPLASH_VISIBLE_MS - elapsed, 0);
      completionTimeoutId = window.setTimeout(() => {
        if (completionTriggeredRef.current) {
          return;
        }

        completionTriggeredRef.current = true;
        onComplete();
      }, completionDelay);

      return () => {
        if (completionTimeoutId !== null) {
          window.clearTimeout(completionTimeoutId);
        }
      };
    }

    const startFadeOut = () => {
      if (completionTriggeredRef.current || fadeStartedRef.current) {
        return;
      }

      fadeStartedRef.current = true;
      setIsFadingOut(true);
      completionTimeoutId = window.setTimeout(() => {
        if (completionTriggeredRef.current) {
          return;
        }

        completionTriggeredRef.current = true;
        onComplete();
      }, SPLASH_FADE_DURATION_MS);
    };

    fadeTimeoutId = window.setTimeout(startFadeOut, Math.max(SPLASH_FADE_START_MS - elapsed, 0));

    return () => {
      if (fadeTimeoutId !== null) {
        window.clearTimeout(fadeTimeoutId);
      }
      if (completionTimeoutId !== null) {
        window.clearTimeout(completionTimeoutId);
      }
    };
  }, [isAppReady, onComplete, prefersReducedMotion]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'max(28px, env(safe-area-inset-top)) 24px max(28px, env(safe-area-inset-bottom))',
        background: 'var(--color-bg)',
        opacity: isFadingOut && !prefersReducedMotion ? 0 : 1,
        transition: prefersReducedMotion ? 'none' : 'opacity 300ms ease',
      }}
    >
      <div style={{ flex: 1 }} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          transform: 'translateY(0)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '64px',
            padding: '12px 18px',
            borderRadius: '14px',
            background: 'var(--color-primary)',
            color: 'var(--color-text-dark)',
            fontSize: '22px',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            opacity: 1,
            animation: prefersReducedMotion ? undefined : 'fp-splash-logo 300ms ease-out both',
          }}
        >
          FIT
        </div>
        <div
          style={{
            color: 'var(--color-primary)',
            fontSize: '30px',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            opacity: 1,
            animation: prefersReducedMotion ? undefined : 'fp-splash-text 300ms ease-out 200ms both',
          }}
        >
          FIT.PERSONA
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            opacity: 0.6,
            animation: prefersReducedMotion ? undefined : 'fp-splash-meta 220ms ease-out 900ms both',
          }}
        >
          <span
            style={{
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Powered by
          </span>
          <span
            style={{
              color: 'var(--color-primary)',
              fontSize: '15px',
              fontWeight: 600,
              letterSpacing: '0.08em',
            }}
          >
            0111
          </span>
        </div>
        <div
          style={{
            color: 'rgba(255, 255, 255, 0.25)',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            opacity: 0.4,
            animation: prefersReducedMotion ? undefined : 'fp-splash-meta 220ms ease-out 1100ms both',
          }}
        >
          v{version}
        </div>
      </div>

      <style>{`
        @keyframes fp-splash-logo {
          from {
            opacity: 0;
            transform: translateY(8px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fp-splash-text {
          from {
            opacity: 0;
            transform: translateY(8px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fp-splash-meta {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
