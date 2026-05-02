import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigationType, useOutlet } from 'react-router-dom';

type Direction = 'forward' | 'back';
type Phase = 'current' | 'enter' | 'exit';

type RouteFrame = {
  key: string;
  element: ReactNode;
  phase: Phase;
  direction: Direction;
};

type RouteHistoryState = {
  currentIndex: number;
  entries: Record<string, number>;
};

const ROUTE_HISTORY_STORAGE_KEY = 'fit.persona.route-history';
const TRANSITION_DURATION_MS = 300;

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

export default function AnimatedRouteShell() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const outlet = useOutlet();
  const locationKey = location.key || `${location.pathname}${location.search}${location.hash}`;
  const frameKey = useMemo(() => locationKey, [locationKey]);
  const indexRef = useRef(resolveHistoryIndex(frameKey, navigationType));
  const currentFrameRef = useRef<RouteFrame>({
    key: frameKey,
    element: outlet,
    phase: 'current',
    direction: 'forward',
  });
  const [frames, setFrames] = useState<RouteFrame[]>([currentFrameRef.current]);

  useEffect(() => {
    if (currentFrameRef.current.key === frameKey) {
      currentFrameRef.current = {
        ...currentFrameRef.current,
        element: outlet,
      };
      setFrames((previousFrames) => previousFrames.map((frame) => (
        frame.key === frameKey
          ? { ...frame, element: outlet, phase: 'current' }
          : frame
      )));
      return;
    }

    const nextIndex = resolveHistoryIndex(frameKey, navigationType);
    const direction: Direction = nextIndex < indexRef.current ? 'back' : 'forward';
    indexRef.current = nextIndex;

    const previousFrame = currentFrameRef.current;
    const enteringFrame: RouteFrame = {
      key: frameKey,
      element: outlet,
      phase: 'enter',
      direction,
    };

    currentFrameRef.current = enteringFrame;
    setFrames([
      { ...previousFrame, phase: 'exit', direction },
      enteringFrame,
    ]);

    const timeoutId = window.setTimeout(() => {
      setFrames([{ ...enteringFrame, phase: 'current' }]);
    }, TRANSITION_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [frameKey, navigationType, outlet]);

  return (
    <div className="route-shell">
      <div className="route-shell__viewport">
        {frames.map((frame) => (
          <div
            key={frame.key}
            className={[
              'route-shell__screen',
              frame.phase === 'current'
                ? 'route-shell__screen--current'
                : `route-shell__screen--${frame.direction}-${frame.phase}`,
            ].join(' ')}
          >
            {frame.element}
          </div>
        ))}
      </div>
    </div>
  );
}
