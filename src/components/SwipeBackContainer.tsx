import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useNavigationType, useOutlet } from 'react-router-dom';
import useSwipeGesture, { findScrollableAncestor, usePrefersReducedMotion } from '../hooks/useSwipeGesture';

type Direction = 'forward' | 'back';
type Phase = 'current' | 'enter' | 'exit';

type RouteFrame = {
  key: string;
  element: ReactNode;
  phase: Phase;
  direction: Direction;
  index: number;
};

type RouteHistoryState = {
  currentIndex: number;
  entries: Record<string, number>;
};

const ROUTE_HISTORY_STORAGE_KEY = 'fit.persona.route-history';
const TRANSITION_DURATION_MS = 300;
const SWIPE_COMMIT_DURATION_MS = 280;
const SWIPE_CANCEL_DURATION_MS = 220;
const SWIPE_BACK_EDGE_PX = 28;
const SWIPE_BACK_DISTANCE_THRESHOLD = 0.38;
const SWIPE_BACK_VELOCITY_THRESHOLD = 0.4;
const PREVIOUS_SCREEN_OFFSET_RATIO = 0.25;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function readRouteHistory(): RouteHistoryState {
  try {
    const stored = sessionStorage.getItem(ROUTE_HISTORY_STORAGE_KEY);
    if (!stored) {
      return { currentIndex: 0, entries: {} };
    }

    const parsed = JSON.parse(stored) as Partial<RouteHistoryState>;
    return {
      currentIndex: typeof parsed.currentIndex === 'number' ? parsed.currentIndex : 0,
      entries: parsed.entries && typeof parsed.entries === 'object' ? parsed.entries : {},
    };
  } catch {
    return { currentIndex: 0, entries: {} };
  }
}

function writeRouteHistory(nextState: RouteHistoryState): void {
  try {
    sessionStorage.setItem(ROUTE_HISTORY_STORAGE_KEY, JSON.stringify(nextState));
  } catch {
    // Silent fail when sessionStorage is unavailable.
  }
}

function resolveHistoryIndex(locationKey: string, navigationType: string): number {
  const routeHistory = readRouteHistory();
  const existingIndex = routeHistory.entries[locationKey];

  if (typeof existingIndex === 'number') {
    routeHistory.currentIndex = existingIndex;
    writeRouteHistory(routeHistory);
    return existingIndex;
  }

  let nextIndex = routeHistory.currentIndex;
  if (navigationType === 'PUSH') {
    nextIndex = routeHistory.currentIndex + 1;
  } else if (navigationType === 'POP') {
    nextIndex = Math.max(0, routeHistory.currentIndex - 1);
  }

  routeHistory.entries[locationKey] = nextIndex;
  routeHistory.currentIndex = nextIndex;
  writeRouteHistory(routeHistory);
  return nextIndex;
}

export default function SwipeBackContainer() {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const outlet = useOutlet();
  const prefersReducedMotion = usePrefersReducedMotion();
  const locationKey = location.key || `${location.pathname}${location.search}${location.hash}`;
  const frameKey = useMemo(() => locationKey, [locationKey]);
  const initialIndexRef = useRef(resolveHistoryIndex(frameKey, navigationType));
  const currentFrameRef = useRef<RouteFrame>({
    key: frameKey,
    element: outlet,
    phase: 'current',
    direction: 'forward',
    index: initialIndexRef.current,
  });
  const historyFramesRef = useRef<Map<number, RouteFrame>>(new Map([
    [initialIndexRef.current, currentFrameRef.current],
  ]));
  const skipNextTransitionRef = useRef(false);
  const transitionTimeoutRef = useRef<number | null>(null);
  const swipeTimeoutRef = useRef<number | null>(null);
  const currentScreenRef = useRef<HTMLDivElement | null>(null);
  const previousScreenRef = useRef<HTMLDivElement | null>(null);
  const swipeOverlayRef = useRef<HTMLDivElement | null>(null);
  const swipeWidthRef = useRef(1);
  const [frames, setFrames] = useState<RouteFrame[]>([currentFrameRef.current]);
  const [isRouteTransitioning, setIsRouteTransitioning] = useState(false);
  const [swipePreviousFrame, setSwipePreviousFrame] = useState<RouteFrame | null>(null);
  const [isSwipePreviewVisible, setIsSwipePreviewVisible] = useState(false);

  const clearSwipeTimeout = () => {
    if (swipeTimeoutRef.current !== null) {
      window.clearTimeout(swipeTimeoutRef.current);
      swipeTimeoutRef.current = null;
    }
  };

  const clearTransitionTimeout = () => {
    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  };

  const cleanupSwipeStyles = () => {
    if (currentScreenRef.current) {
      currentScreenRef.current.style.removeProperty('transform');
      currentScreenRef.current.style.removeProperty('transition');
      currentScreenRef.current.style.removeProperty('will-change');
    }

    if (previousScreenRef.current) {
      previousScreenRef.current.style.removeProperty('transform');
      previousScreenRef.current.style.removeProperty('opacity');
      previousScreenRef.current.style.removeProperty('transition');
      previousScreenRef.current.style.removeProperty('will-change');
    }

    if (swipeOverlayRef.current) {
      swipeOverlayRef.current.style.removeProperty('opacity');
      swipeOverlayRef.current.style.removeProperty('transition');
      swipeOverlayRef.current.style.removeProperty('will-change');
    }
  };

  const finishSwipePreview = () => {
    cleanupSwipeStyles();
    setIsSwipePreviewVisible(false);
    setSwipePreviousFrame(null);
  };

  const applySwipeProgress = (progress: number) => {
    const currentScreen = currentScreenRef.current;
    const previousScreen = previousScreenRef.current;
    const overlay = swipeOverlayRef.current;

    if (!currentScreen || !previousScreen || !overlay) {
      return;
    }

    const width = swipeWidthRef.current || window.innerWidth || 1;
    const clampedProgress = clamp(progress, 0, 1);
    const currentTranslateX = width * clampedProgress;
    const previousTranslateX = (-width * PREVIOUS_SCREEN_OFFSET_RATIO) * (1 - clampedProgress);
    const previousOpacity = 0.7 + (clampedProgress * 0.3);
    const overlayOpacity = 0.5 * (1 - clampedProgress);

    currentScreen.style.transition = 'none';
    currentScreen.style.transform = `translate3d(${currentTranslateX}px, 0, 0)`;
    currentScreen.style.willChange = 'transform';

    previousScreen.style.transition = 'none';
    previousScreen.style.transform = `translate3d(${previousTranslateX}px, 0, 0)`;
    previousScreen.style.opacity = String(previousOpacity);
    previousScreen.style.willChange = 'transform, opacity';

    overlay.style.transition = 'none';
    overlay.style.opacity = String(overlayOpacity);
    overlay.style.willChange = 'opacity';
  };

  const animateSwipeBackCommit = () => {
    const currentScreen = currentScreenRef.current;
    const previousScreen = previousScreenRef.current;
    const overlay = swipeOverlayRef.current;

    if (!currentScreen || !previousScreen || !overlay) {
      finishSwipePreview();
      navigate(-1);
      return;
    }

    const width = swipeWidthRef.current || currentScreen.offsetWidth || window.innerWidth || 1;
    const transition = `transform ${SWIPE_COMMIT_DURATION_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`;

    currentScreen.style.transition = transition;
    currentScreen.style.transform = `translate3d(${width}px, 0, 0)`;

    previousScreen.style.transition = `transform ${SWIPE_COMMIT_DURATION_MS}ms cubic-bezier(0.32, 0.72, 0, 1), opacity ${SWIPE_COMMIT_DURATION_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`;
    previousScreen.style.transform = 'translate3d(0, 0, 0)';
    previousScreen.style.opacity = '1';

    overlay.style.transition = `opacity ${SWIPE_COMMIT_DURATION_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`;
    overlay.style.opacity = '0';

    clearSwipeTimeout();
    swipeTimeoutRef.current = window.setTimeout(() => {
      swipeTimeoutRef.current = null;
      skipNextTransitionRef.current = true;
      finishSwipePreview();
      navigate(-1);
    }, SWIPE_COMMIT_DURATION_MS);
  };

  const animateSwipeBackCancel = () => {
    const currentScreen = currentScreenRef.current;
    const previousScreen = previousScreenRef.current;
    const overlay = swipeOverlayRef.current;

    if (!currentScreen || !previousScreen || !overlay) {
      finishSwipePreview();
      return;
    }

    const width = swipeWidthRef.current || currentScreen.offsetWidth || window.innerWidth || 1;

    currentScreen.style.transition = `transform ${SWIPE_CANCEL_DURATION_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
    currentScreen.style.transform = 'translate3d(0, 0, 0)';

    previousScreen.style.transition = `transform ${SWIPE_CANCEL_DURATION_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity ${SWIPE_CANCEL_DURATION_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
    previousScreen.style.transform = `translate3d(${-width * PREVIOUS_SCREEN_OFFSET_RATIO}px, 0, 0)`;
    previousScreen.style.opacity = '0.7';

    overlay.style.transition = `opacity ${SWIPE_CANCEL_DURATION_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
    overlay.style.opacity = '0.5';

    clearSwipeTimeout();
    swipeTimeoutRef.current = window.setTimeout(() => {
      swipeTimeoutRef.current = null;
      finishSwipePreview();
    }, SWIPE_CANCEL_DURATION_MS);
  };

  useEffect(() => {
    if (currentFrameRef.current.key === frameKey) {
      const updatedCurrentFrame = {
        ...currentFrameRef.current,
        element: outlet,
      };

      currentFrameRef.current = updatedCurrentFrame;
      historyFramesRef.current.set(updatedCurrentFrame.index, updatedCurrentFrame);
      setFrames((previousFrames) => previousFrames.map((frame) => (
        frame.key === frameKey
          ? { ...frame, element: outlet, phase: 'current' }
          : frame
      )));
      return;
    }

    const nextIndex = resolveHistoryIndex(frameKey, navigationType);
    const direction: Direction = nextIndex < currentFrameRef.current.index ? 'back' : 'forward';
    const previousFrame = currentFrameRef.current;
    const enteringFrame: RouteFrame = {
      key: frameKey,
      element: outlet,
      phase: 'enter',
      direction,
      index: nextIndex,
    };

    historyFramesRef.current.set(previousFrame.index, previousFrame);
    historyFramesRef.current.set(nextIndex, enteringFrame);
    currentFrameRef.current = enteringFrame;

    if (skipNextTransitionRef.current || prefersReducedMotion) {
      skipNextTransitionRef.current = false;
      setFrames([{ ...enteringFrame, phase: 'current' }]);
      setIsRouteTransitioning(false);
      finishSwipePreview();
      return;
    }

    setIsRouteTransitioning(true);
    setFrames([
      { ...previousFrame, phase: 'exit', direction },
      enteringFrame,
    ]);

    clearTransitionTimeout();
    transitionTimeoutRef.current = window.setTimeout(() => {
      transitionTimeoutRef.current = null;
      setFrames([{ ...enteringFrame, phase: 'current' }]);
      setIsRouteTransitioning(false);
    }, TRANSITION_DURATION_MS);
  }, [frameKey, navigationType, outlet, prefersReducedMotion]);

  useEffect(() => {
    return () => {
      clearTransitionTimeout();
      clearSwipeTimeout();
    };
  }, []);

  const swipeBackGesture = useSwipeGesture({
    axis: 'horizontal',
    shouldStart: (metrics) => {
      if (metrics.startX > SWIPE_BACK_EDGE_PX || isRouteTransitioning || isSwipePreviewVisible) {
        return false;
      }

      if (currentFrameRef.current.index <= 0) {
        return false;
      }

      const previousFrame = historyFramesRef.current.get(currentFrameRef.current.index - 1);
      if (!previousFrame) {
        return false;
      }

      const currentScreen = currentScreenRef.current;
      if (!currentScreen) {
        return false;
      }

      return !findScrollableAncestor(metrics.target, currentScreen);
    },
    onStart: () => {
      const previousFrame = historyFramesRef.current.get(currentFrameRef.current.index - 1);
      if (!previousFrame) {
        return;
      }

      swipeWidthRef.current = currentScreenRef.current?.offsetWidth || window.innerWidth || 1;

      setSwipePreviousFrame(previousFrame);
      setIsSwipePreviewVisible(true);

      if (prefersReducedMotion) {
        return;
      }

      window.requestAnimationFrame(() => {
        applySwipeProgress(0);
      });
    },
    onMove: (metrics) => {
      if (prefersReducedMotion || metrics.deltaX <= 0 || !metrics.isHorizontal) {
        return;
      }

      const width = swipeWidthRef.current || window.innerWidth || 1;
      applySwipeProgress(clamp(metrics.deltaX / width, 0, 1));
    },
    onCancel: () => {
      if (!isSwipePreviewVisible) {
        return;
      }

      if (prefersReducedMotion) {
        finishSwipePreview();
        return;
      }

      animateSwipeBackCancel();
    },
    onEnd: (metrics) => {
      const width = swipeWidthRef.current || currentScreenRef.current?.offsetWidth || window.innerWidth || 1;
      const progress = clamp(Math.max(metrics.deltaX, 0) / width, 0, 1);
      const shouldCommit = metrics.direction === 'right'
        && metrics.isHorizontal
        && (progress > SWIPE_BACK_DISTANCE_THRESHOLD || metrics.velocityX > SWIPE_BACK_VELOCITY_THRESHOLD);

      if (prefersReducedMotion) {
        finishSwipePreview();
        if (shouldCommit) {
          skipNextTransitionRef.current = true;
          navigate(-1);
        }
        return;
      }

      if (shouldCommit) {
        animateSwipeBackCommit();
        return;
      }

      animateSwipeBackCancel();
    },
  });

  useLayoutEffect(() => {
    const currentScreen = currentScreenRef.current;
    if (!currentScreen) {
      return;
    }

    return swipeBackGesture.bind(currentScreen);
  }, [frameKey, swipeBackGesture.bind]);

  return (
    <div className="route-shell">
      <div className="route-shell__viewport">
        {isSwipePreviewVisible && swipePreviousFrame ? (
          <div
            ref={previousScreenRef}
            className="route-shell__screen"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              transform: `translate3d(${-100 * PREVIOUS_SCREEN_OFFSET_RATIO}%, 0, 0)`,
              opacity: 0.7,
            }}
          >
            {swipePreviousFrame.element}
          </div>
        ) : null}

        {isSwipePreviewVisible ? (
          <div
            ref={swipeOverlayRef}
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
              background: 'rgba(0, 0, 0, 0.5)',
              pointerEvents: 'none',
            }}
          />
        ) : null}

        {frames.map((frame) => {
          const isInteractiveFrame = frame.key === currentFrameRef.current.key && frame.phase !== 'exit';

          return (
            <div
              key={frame.key}
              ref={isInteractiveFrame ? currentScreenRef : null}
              className={[
                'route-shell__screen',
                frame.phase === 'current'
                  ? 'route-shell__screen--current'
                  : `route-shell__screen--${frame.direction}-${frame.phase}`,
              ].join(' ')}
              style={isSwipePreviewVisible && isInteractiveFrame ? { zIndex: 2 } : undefined}
            >
              {frame.element}
            </div>
          );
        })}
      </div>
    </div>
  );
}
