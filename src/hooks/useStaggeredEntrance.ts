import { type CSSProperties, useCallback, useEffect, useState } from 'react';

type UseStaggeredEntranceArgs = {
  itemCount: number;
  baseDelay?: number;
  duration?: number;
  once?: boolean;
};

type StaggeredItemProps = {
  style: CSSProperties;
  className: string;
};

type UseStaggeredEntranceResult = {
  getItemProps: (index: number) => StaggeredItemProps;
};

const STAGGER_STYLE_ID = 'use-staggered-entrance-styles';
const DEFAULT_BASE_DELAY = 40;
const DEFAULT_DURATION = 350;
const MAX_DELAY_INDEX = 10;
const STAGGERED_ENTRANCE_STYLES = `
  .staggered-entrance {
    opacity: 1;
    transform: translate3d(0, 0, 0);
    animation-duration: var(--staggered-entrance-duration, 350ms);
    animation-delay: var(--staggered-entrance-delay, 0ms);
    animation-fill-mode: both;
    animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
    backface-visibility: hidden;
  }

  .staggered-entrance--static {
    animation: none;
  }

  .staggered-entrance--run-a {
    animation-name: staggered-entrance-slide-a;
  }

  .staggered-entrance--run-b {
    animation-name: staggered-entrance-slide-b;
  }

  .staggered-entrance--fade-a {
    animation-name: staggered-entrance-fade-a;
  }

  .staggered-entrance--fade-b {
    animation-name: staggered-entrance-fade-b;
  }

  @keyframes staggered-entrance-slide-a {
    from {
      opacity: 0;
      transform: translate3d(0, 12px, 0);
    }

    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }

  @keyframes staggered-entrance-slide-b {
    from {
      opacity: 0;
      transform: translate3d(0, 12px, 0);
    }

    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }

  @keyframes staggered-entrance-fade-a {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  @keyframes staggered-entrance-fade-b {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }
`;

function ensureStaggerStyles() {
  if (typeof document === 'undefined') {
    return;
  }

  try {
    if (document.getElementById(STAGGER_STYLE_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = STAGGER_STYLE_ID;
    style.textContent = STAGGERED_ENTRANCE_STYLES;
    document.head.appendChild(style);
  } catch {
    // Silent fail when the document head is unavailable.
  }
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    try {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const updatePreference = () => {
        setPrefersReducedMotion(mediaQuery.matches);
      };

      updatePreference();

      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', updatePreference);
      } else {
        mediaQuery.addListener(updatePreference);
      }

      return () => {
        if (typeof mediaQuery.removeEventListener === 'function') {
          mediaQuery.removeEventListener('change', updatePreference);
        } else {
          mediaQuery.removeListener(updatePreference);
        }
      };
    } catch {
      return;
    }
  }, []);

  return prefersReducedMotion;
}

export default function useStaggeredEntrance({
  itemCount,
  baseDelay = DEFAULT_BASE_DELAY,
  duration = DEFAULT_DURATION,
  once = true,
}: UseStaggeredEntranceArgs): UseStaggeredEntranceResult {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [runId, setRunId] = useState(0);
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    ensureStaggerStyles();
  }, []);

  useEffect(() => {
    if (itemCount <= 0) {
      return;
    }

    if (once && hasPlayed) {
      return;
    }

    setRunId((current) => current + 1);
    if (once) {
      setHasPlayed(true);
    }
  }, [baseDelay, duration, hasPlayed, itemCount, once]);

  const getItemProps = useCallback((index: number): StaggeredItemProps => {
    const cappedDelay = `${Math.min(index, MAX_DELAY_INDEX) * baseDelay}ms`;
    const sharedStyle = {
      '--staggered-entrance-delay': cappedDelay,
      '--staggered-entrance-duration': `${duration}ms`,
      willChange: runId > 0 ? ('transform, opacity' as const) : undefined,
    } as CSSProperties;

    if (runId === 0 || itemCount <= 0) {
      return {
        style: sharedStyle,
        className: 'staggered-entrance staggered-entrance--static',
      };
    }

    const animationClassName = prefersReducedMotion
      ? (runId % 2 === 0 ? 'staggered-entrance--fade-a' : 'staggered-entrance--fade-b')
      : (runId % 2 === 0 ? 'staggered-entrance--run-a' : 'staggered-entrance--run-b');

    return {
      style: sharedStyle,
      className: `staggered-entrance ${animationClassName}`,
    };
  }, [baseDelay, duration, itemCount, prefersReducedMotion, runId]);

  return { getItemProps };
}
