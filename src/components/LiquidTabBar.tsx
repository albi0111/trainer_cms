import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

export type Tab = {
  icon: ReactNode;
  route: string;
};

type LiquidTabBarProps = {
  tabs: Tab[];
  activeIndex: number;
  onChange: (index: number) => void;
};

type IconMotion = {
  from: number;
  to: number;
};

type TransformSnapshot = {
  x: number;
  scaleX: number;
};

const PILL_ANIMATION_MS = 380;
const PILL_PHASE_ONE_DISTANCE = 0.6;
const ICON_ARRIVAL_OVERSHOOT_PERCENT = 73.6842;
const LIQUID_TAB_BAR_STYLES = `
  .liquid-tab-bar {
    width: 100%;
    padding-bottom: max(8px, env(safe-area-inset-bottom));
    -webkit-tap-highlight-color: transparent;
  }

  .liquid-tab-bar__inner {
    position: relative;
    display: grid;
    grid-template-columns: repeat(var(--liquid-tab-count), minmax(0, 1fr));
    align-items: center;
    min-height: 64px;
    padding: 4px;
    border-radius: 999px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
      rgba(15, 15, 15, 0.96);
    border: 1px solid rgba(255, 255, 255, 0.06);
    box-shadow:
      0 18px 30px -24px rgba(0, 0, 0, 0.92),
      inset 0 1px 0 rgba(255, 255, 255, 0.04);
    overflow: hidden;
    isolation: isolate;
  }

  .liquid-tab-bar__pill {
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 4px;
    width: calc((100% - 8px) / var(--liquid-tab-count));
    border-radius: 999px;
    background: rgba(var(--color-primary-rgb), 0.15);
    box-shadow:
      inset 0 0 0 1px rgba(var(--color-primary-rgb), 0.2),
      0 10px 24px -20px rgba(var(--color-primary-rgb), 0.65);
    pointer-events: none;
    z-index: 0;
    opacity: 1;
    transform: translate3d(calc(var(--liquid-pill-display-x, 0) * 100%), 0, 0)
      scaleX(var(--liquid-pill-display-scale, 1));
    backface-visibility: hidden;
  }

  .liquid-tab-bar__pill[data-direction="right"] {
    transform-origin: left center;
  }

  .liquid-tab-bar__pill[data-direction="left"] {
    transform-origin: right center;
  }

  .liquid-tab-bar__pill--animating {
    animation: liquid-tab-bar-pill-travel ${PILL_ANIMATION_MS}ms both;
  }

  .liquid-tab-bar__tab {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    min-height: 56px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: #ffffff;
    appearance: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  .liquid-tab-bar__tab--active {
    color: var(--color-primary);
  }

  .liquid-tab-bar__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 56px;
    opacity: 0.4;
    transform: translateZ(0) scale(0.85);
    backface-visibility: hidden;
  }

  .liquid-tab-bar__tab--active .liquid-tab-bar__icon {
    opacity: 1;
    transform: translateZ(0) scale(1);
  }

  .liquid-tab-bar__icon--departing {
    animation: liquid-tab-bar-icon-depart 150ms both;
  }

  .liquid-tab-bar__icon--arriving {
    animation: liquid-tab-bar-icon-arrive ${PILL_ANIMATION_MS}ms both;
  }

  @keyframes liquid-tab-bar-pill-travel {
    0% {
      transform: translate3d(calc(var(--liquid-pill-from, 0) * 100%), 0, 0)
        scaleX(var(--liquid-pill-start-scale, 1));
      animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    47.3684% {
      transform: translate3d(calc(var(--liquid-pill-mid, 0) * 100%), 0, 0)
        scaleX(var(--liquid-pill-peak-scale, 1.6));
      animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    84.2105% {
      transform: translate3d(calc(var(--liquid-pill-to, 0) * 100%), 0, 0)
        scaleX(var(--liquid-pill-overshoot-scale, 0.88));
      animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    100% {
      transform: translate3d(calc(var(--liquid-pill-to, 0) * 100%), 0, 0) scaleX(1);
    }
  }

  @keyframes liquid-tab-bar-icon-depart {
    from {
      opacity: 1;
      transform: translateZ(0) scale(1);
    }

    to {
      opacity: 0.4;
      transform: translateZ(0) scale(0.85);
    }
  }

  @keyframes liquid-tab-bar-icon-arrive {
    0% {
      opacity: 0.4;
      transform: translateZ(0) scale(0.85);
      animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    ${ICON_ARRIVAL_OVERSHOOT_PERCENT}% {
      opacity: 1;
      transform: translateZ(0) scale(1.12);
      animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    100% {
      opacity: 1;
      transform: translateZ(0) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .liquid-tab-bar__pill,
    .liquid-tab-bar__icon,
    .liquid-tab-bar__icon--departing,
    .liquid-tab-bar__icon--arriving {
      animation: none !important;
      transition: none !important;
    }
  }
`;

type WebKitMatrixCtor = new (transform: string) => {
  a: number;
  m41: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function routeToLabel(route: string) {
  const parts = route.split('/').filter(Boolean);
  const leaf = parts[parts.length - 1] ?? 'tab';
  return leaf
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

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
  }, []);

  return prefersReducedMotion;
}

function readCurrentTransform(element: HTMLElement, fallbackIndex: number, slotWidth: number) {
  const computedTransform = window.getComputedStyle(element).transform;
  if (!computedTransform || computedTransform === 'none' || slotWidth <= 0) {
    return { x: fallbackIndex, scaleX: 1 };
  }

  const windowWithWebKitMatrix = window as Window & { WebKitCSSMatrix?: WebKitMatrixCtor };
  const Matrix = window.DOMMatrixReadOnly ?? windowWithWebKitMatrix.WebKitCSSMatrix;
  if (!Matrix) {
    return { x: fallbackIndex, scaleX: 1 };
  }

  try {
    const matrix = new Matrix(computedTransform);
    const x = matrix.m41 / slotWidth;
    const scaleX = matrix.a;
    if (!Number.isFinite(x) || !Number.isFinite(scaleX)) {
      return { x: fallbackIndex, scaleX: 1 };
    }

    return { x, scaleX };
  } catch {
    return { x: fallbackIndex, scaleX: 1 };
  }
}

function setPillDisplay(element: HTMLElement, snapshot: TransformSnapshot) {
  element.style.setProperty('--liquid-pill-display-x', snapshot.x.toFixed(4));
  element.style.setProperty('--liquid-pill-display-scale', snapshot.scaleX.toFixed(4));
}

export default function LiquidTabBar({ tabs, activeIndex, onChange }: LiquidTabBarProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const pillRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const pendingUserIndexRef = useRef<number | null>(null);
  const previousIndexRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const iconMotionTimeoutRef = useRef<number | null>(null);
  const slotWidthRef = useRef(0);
  const pillTargetRef = useRef(0);
  const [iconMotion, setIconMotion] = useState<IconMotion | null>(null);
  const hasTabs = tabs.length > 0;
  const safeTabCount = Math.max(tabs.length, 1);
  const safeActiveIndex = hasTabs ? clamp(activeIndex, 0, tabs.length - 1) : 0;
  if (!mountedRef.current) {
    previousIndexRef.current = safeActiveIndex;
    pillTargetRef.current = safeActiveIndex;
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const syncSlotWidth = (width: number) => {
      slotWidthRef.current = tabs.length > 0 ? width / tabs.length : 0;
    };

    syncSlotWidth(container.getBoundingClientRect().width);

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width;
      if (typeof nextWidth === 'number') {
        syncSlotWidth(nextWidth);
      }
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, [tabs.length]);

  useEffect(() => {
    const pill = pillRef.current;
    if (!pill) {
      return;
    }

    const handleAnimationEnd = (event: AnimationEvent) => {
      if (event.animationName !== 'liquid-tab-bar-pill-travel') {
        return;
      }

      pill.classList.remove('liquid-tab-bar__pill--animating');
      pill.style.willChange = '';
      setPillDisplay(pill, { x: pillTargetRef.current, scaleX: 1 });
    };

    pill.addEventListener('animationend', handleAnimationEnd);
    return () => {
      pill.removeEventListener('animationend', handleAnimationEnd);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      if (iconMotionTimeoutRef.current !== null) {
        window.clearTimeout(iconMotionTimeoutRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    const pill = pillRef.current;
    const container = containerRef.current;
    if (!pill || !container) {
      return;
    }

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (iconMotionTimeoutRef.current !== null) {
      window.clearTimeout(iconMotionTimeoutRef.current);
      iconMotionTimeoutRef.current = null;
    }

    if (tabs.length > 0 && slotWidthRef.current <= 0) {
      slotWidthRef.current = container.getBoundingClientRect().width / tabs.length;
    }

    const isFirstRender = !mountedRef.current;
    const previousIndex = previousIndexRef.current;
    const isUserInitiated = pendingUserIndexRef.current === safeActiveIndex;

    if (isFirstRender || prefersReducedMotion || !isUserInitiated || previousIndex === safeActiveIndex) {
      pill.classList.remove('liquid-tab-bar__pill--animating');
      pill.style.willChange = '';
      setPillDisplay(pill, { x: safeActiveIndex, scaleX: 1 });
      pillTargetRef.current = safeActiveIndex;
      previousIndexRef.current = safeActiveIndex;
      pendingUserIndexRef.current = null;
      setIconMotion(null);
      mountedRef.current = true;
      return;
    }

    const currentSnapshot = readCurrentTransform(pill, previousIndex, slotWidthRef.current);
    const distance = safeActiveIndex - currentSnapshot.x;
    const direction = safeActiveIndex > previousIndex ? 'right' : 'left';
    const midPoint = currentSnapshot.x + distance * PILL_PHASE_ONE_DISTANCE;

    pill.dataset.direction = direction;
    pillTargetRef.current = safeActiveIndex;
    pill.style.willChange = 'transform, opacity';
    setPillDisplay(pill, currentSnapshot);
    pill.style.setProperty('--liquid-pill-from', currentSnapshot.x.toFixed(4));
    pill.style.setProperty('--liquid-pill-mid', midPoint.toFixed(4));
    pill.style.setProperty('--liquid-pill-to', safeActiveIndex.toFixed(4));
    pill.style.setProperty('--liquid-pill-start-scale', currentSnapshot.scaleX.toFixed(4));
    pill.style.setProperty('--liquid-pill-peak-scale', '1.6');
    pill.style.setProperty('--liquid-pill-overshoot-scale', '0.88');
    pill.classList.remove('liquid-tab-bar__pill--animating');

    frameRef.current = window.requestAnimationFrame(() => {
      pill.classList.add('liquid-tab-bar__pill--animating');
      frameRef.current = null;
    });

    setIconMotion({ from: previousIndex, to: safeActiveIndex });
    iconMotionTimeoutRef.current = window.setTimeout(() => {
      setIconMotion(null);
      iconMotionTimeoutRef.current = null;
    }, PILL_ANIMATION_MS);

    previousIndexRef.current = safeActiveIndex;
    pendingUserIndexRef.current = null;
    mountedRef.current = true;
  }, [prefersReducedMotion, safeActiveIndex, tabs.length]);

  if (!hasTabs) {
    return null;
  }

  const navStyle = {
    '--liquid-tab-count': safeTabCount,
  } as CSSProperties;

  return (
    <nav className="liquid-tab-bar" aria-label="Primary">
      <style>{LIQUID_TAB_BAR_STYLES}</style>
      <div className="liquid-tab-bar__inner" ref={containerRef} style={navStyle}>
        <div className="liquid-tab-bar__pill" ref={pillRef} aria-hidden="true" />
        {tabs.map((tab, index) => {
          const isActive = index === safeActiveIndex;
          const isDeparting = iconMotion?.from === index && iconMotion.from !== iconMotion.to;
          const isArriving = iconMotion?.to === index && iconMotion.from !== iconMotion.to;
          const iconClassName = [
            'liquid-tab-bar__icon',
            isDeparting ? 'liquid-tab-bar__icon--departing' : '',
            isArriving ? 'liquid-tab-bar__icon--arriving' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={tab.route}
              type="button"
              className={`liquid-tab-bar__tab${isActive ? ' liquid-tab-bar__tab--active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={routeToLabel(tab.route)}
              title={routeToLabel(tab.route)}
              onClick={() => {
                if (index === safeActiveIndex) {
                  return;
                }

                pendingUserIndexRef.current = index;
                onChange(index);
              }}
            >
              <span className={iconClassName}>{tab.icon}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
