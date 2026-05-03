import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null;

export type SwipeGestureState = {
  isDragging: boolean;
  progress: number;
  direction: SwipeDirection;
  velocity: number;
};

export type SwipeGestureMetrics = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  velocityX: number;
  velocityY: number;
  elapsedTime: number;
  direction: SwipeDirection;
  isHorizontal: boolean;
  isVertical: boolean;
  progress: number;
  target: EventTarget | null;
};

type UseSwipeGestureOptions = {
  axis?: 'horizontal' | 'vertical' | 'both';
  shouldStart?: (metrics: SwipeGestureMetrics, event: TouchEvent) => boolean;
  onStart?: (metrics: SwipeGestureMetrics, event: TouchEvent) => void;
  onMove?: (metrics: SwipeGestureMetrics, event: TouchEvent) => void;
  onEnd?: (metrics: SwipeGestureMetrics, event: TouchEvent) => void;
  onCancel?: (metrics: SwipeGestureMetrics | null) => void;
};

type GestureTrackingState = {
  active: boolean;
  hasStarted: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
  target: EventTarget | null;
};

type ModalVelocityDismissOptions<TOverlay extends HTMLElement, TSheet extends HTMLElement> = {
  visible: boolean;
  onClose: () => void;
  overlayRef: RefObject<TOverlay | null>;
  sheetRef: RefObject<TSheet | null>;
  overlayMode?: 'opacity' | 'dialog-backdrop';
  enabled?: boolean;
};

const SCROLL_CANCEL_THRESHOLD = 10;
const START_THRESHOLD = 4;
const MODAL_HANDLE_BASE_WIDTH = 36;
const MODAL_HANDLE_DRAG_WIDTH = 48;
const MODAL_DISMISS_THRESHOLD = 0.4;
const MODAL_DISMISS_VELOCITY = 0.55;
const MODAL_FAST_DISMISS_VELOCITY = 0.8;
const MODAL_RESISTANCE_FACTOR = 0.3;
const MODAL_SCROLL_TOLERANCE = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function resolveDirection(deltaX: number, deltaY: number): SwipeDirection {
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    if (deltaX > 0) {
      return 'right';
    }

    if (deltaX < 0) {
      return 'left';
    }

    return null;
  }

  if (deltaY > 0) {
    return 'down';
  }

  if (deltaY < 0) {
    return 'up';
  }

  return null;
}

function createMetrics(
  trackingState: GestureTrackingState,
  axis: UseSwipeGestureOptions['axis'],
): SwipeGestureMetrics {
  const deltaX = trackingState.currentX - trackingState.startX;
  const deltaY = trackingState.currentY - trackingState.startY;
  const elapsedTime = Math.max(performance.now() - trackingState.startTime, 1);
  const velocityX = deltaX / elapsedTime;
  const velocityY = deltaY / elapsedTime;
  const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
  const isVertical = Math.abs(deltaY) > Math.abs(deltaX);
  const dominantDistance = axis === 'vertical'
    ? Math.abs(deltaY)
    : axis === 'horizontal'
      ? Math.abs(deltaX)
      : Math.max(Math.abs(deltaX), Math.abs(deltaY));

  return {
    startX: trackingState.startX,
    startY: trackingState.startY,
    currentX: trackingState.currentX,
    currentY: trackingState.currentY,
    deltaX,
    deltaY,
    velocityX,
    velocityY,
    elapsedTime,
    direction: resolveDirection(deltaX, deltaY),
    isHorizontal,
    isVertical,
    progress: dominantDistance,
    target: trackingState.target,
  };
}

function isScrollableElement(element: HTMLElement): boolean {
  try {
    const style = window.getComputedStyle(element);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;
    const canScrollY = (overflowY === 'auto' || overflowY === 'scroll') && element.scrollHeight > element.clientHeight;
    const canScrollX = (overflowX === 'auto' || overflowX === 'scroll') && element.scrollWidth > element.clientWidth;
    return canScrollY || canScrollX;
  } catch {
    return false;
  }
}

export function findScrollableAncestor(target: EventTarget | null, boundary: HTMLElement | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  let current: HTMLElement | null = target;

  while (current) {
    if (isScrollableElement(current)) {
      return current;
    }

    if (boundary && current === boundary) {
      break;
    }

    current = current.parentElement;
  }

  return null;
}

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

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

  return prefersReducedMotion;
}

export default function useSwipeGesture({
  axis = 'both',
  shouldStart,
  onStart,
  onMove,
  onEnd,
  onCancel,
}: UseSwipeGestureOptions) {
  const gestureStateRef = useRef<SwipeGestureState>({
    isDragging: false,
    progress: 0,
    direction: null,
    velocity: 0,
  });
  const trackingStateRef = useRef<GestureTrackingState>({
    active: false,
    hasStarted: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    startTime: 0,
    target: null,
  });
  const cleanupWindowListenersRef = useRef<(() => void) | null>(null);
  const latestOptionsRef = useRef({
    axis,
    shouldStart,
    onStart,
    onMove,
    onEnd,
    onCancel,
  });

  latestOptionsRef.current = {
    axis,
    shouldStart,
    onStart,
    onMove,
    onEnd,
    onCancel,
  };

  const teardownGesture = useCallback((notifyCancel: boolean) => {
    const trackingState = trackingStateRef.current;
    const metrics = trackingState.active
      ? createMetrics(trackingState, latestOptionsRef.current.axis)
      : null;

    trackingStateRef.current = {
      active: false,
      hasStarted: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      startTime: 0,
      target: null,
    };
    gestureStateRef.current.isDragging = false;
    gestureStateRef.current.progress = 0;
    gestureStateRef.current.direction = null;
    gestureStateRef.current.velocity = 0;

    cleanupWindowListenersRef.current?.();
    cleanupWindowListenersRef.current = null;

    if (notifyCancel) {
      latestOptionsRef.current.onCancel?.(metrics);
    }
  }, []);

  const bind = useCallback((element: HTMLElement) => {
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      const trackingState = trackingStateRef.current;

      if (!trackingState.active || !touch) {
        return;
      }

      if (event.touches.length > 1) {
        teardownGesture(true);
        return;
      }

      trackingState.currentX = touch.clientX;
      trackingState.currentY = touch.clientY;

      const metrics = createMetrics(trackingState, latestOptionsRef.current.axis);
      const absX = Math.abs(metrics.deltaX);
      const absY = Math.abs(metrics.deltaY);

      if (!trackingState.hasStarted) {
        if (latestOptionsRef.current.axis === 'horizontal' && absY > absX && absX < SCROLL_CANCEL_THRESHOLD) {
          teardownGesture(true);
          return;
        }

        if (latestOptionsRef.current.axis === 'vertical' && absX > absY && absY < SCROLL_CANCEL_THRESHOLD) {
          teardownGesture(true);
          return;
        }

        if (absX < START_THRESHOLD && absY < START_THRESHOLD) {
          return;
        }

        trackingState.hasStarted = true;
        gestureStateRef.current.isDragging = true;
        gestureStateRef.current.progress = 0;
        gestureStateRef.current.direction = metrics.direction;
        gestureStateRef.current.velocity = latestOptionsRef.current.axis === 'vertical'
          ? Math.abs(metrics.velocityY)
          : Math.abs(metrics.velocityX);
        latestOptionsRef.current.onStart?.(metrics, event);
      }

      gestureStateRef.current.progress = latestOptionsRef.current.axis === 'vertical'
        ? Math.abs(metrics.deltaY)
        : latestOptionsRef.current.axis === 'horizontal'
          ? Math.abs(metrics.deltaX)
          : Math.max(absX, absY);
      gestureStateRef.current.direction = metrics.direction;
      gestureStateRef.current.velocity = latestOptionsRef.current.axis === 'vertical'
        ? Math.abs(metrics.velocityY)
        : latestOptionsRef.current.axis === 'horizontal'
          ? Math.abs(metrics.velocityX)
          : Math.max(Math.abs(metrics.velocityX), Math.abs(metrics.velocityY));
      latestOptionsRef.current.onMove?.(metrics, event);
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const trackingState = trackingStateRef.current;
      if (!trackingState.active) {
        return;
      }

      const metrics = createMetrics(trackingState, latestOptionsRef.current.axis);
      const hasStarted = trackingState.hasStarted;
      teardownGesture(!hasStarted);

      if (hasStarted) {
        latestOptionsRef.current.onEnd?.(metrics, event);
      }
    };

    const handleTouchCancel = () => {
      teardownGesture(true);
    };

    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];

      if (!touch || event.touches.length > 1) {
        teardownGesture(true);
        return;
      }

      const nextTrackingState: GestureTrackingState = {
        active: true,
        hasStarted: false,
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        startTime: performance.now(),
        target: event.target,
      };
      const metrics = createMetrics(nextTrackingState, latestOptionsRef.current.axis);

      if (latestOptionsRef.current.shouldStart && !latestOptionsRef.current.shouldStart(metrics, event)) {
        return;
      }

      trackingStateRef.current = nextTrackingState;

      try {
        const windowTarget = window;
        windowTarget.addEventListener('touchmove', handleTouchMove, { passive: true });
        windowTarget.addEventListener('touchend', handleTouchEnd, { passive: true });
        windowTarget.addEventListener('touchcancel', handleTouchCancel, { passive: true });
        cleanupWindowListenersRef.current = () => {
          windowTarget.removeEventListener('touchmove', handleTouchMove);
          windowTarget.removeEventListener('touchend', handleTouchEnd);
          windowTarget.removeEventListener('touchcancel', handleTouchCancel);
        };
      } catch {
        trackingStateRef.current.active = false;
      }
    };

    try {
      element.addEventListener('touchstart', handleTouchStart, { passive: true });
    } catch {
      return () => undefined;
    }

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      teardownGesture(false);
    };
  }, [teardownGesture]);

  return {
    bind,
    gestureState: gestureStateRef.current,
  };
}

function getModalDismissDuration(velocityY: number): number {
  if (velocityY > MODAL_FAST_DISMISS_VELOCITY) {
    return 180;
  }

  if (velocityY > MODAL_DISMISS_VELOCITY) {
    return 240;
  }

  return 300;
}

export function useModalVelocityDismiss<TOverlay extends HTMLElement, TSheet extends HTMLElement>({
  visible,
  onClose,
  overlayRef,
  sheetRef,
  overlayMode = 'opacity',
  enabled = true,
}: ModalVelocityDismissOptions<TOverlay, TSheet>): void {
  const prefersReducedMotion = usePrefersReducedMotion();
  const unbindRef = useRef<(() => void) | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);
  const resetTimeoutRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);
  const layoutRef = useRef({
    modalHeight: 1,
    viewportHeight: 0,
  });
  const bind = useSwipeGesture({
    axis: 'vertical',
    shouldStart: (metrics) => {
      if (!visible || !enabled || isAnimatingRef.current) {
        return false;
      }

      const sheet = sheetRef.current;
      if (!sheet) {
        return false;
      }

      const scrollableAncestor = findScrollableAncestor(metrics.target, sheet);
      return !scrollableAncestor || scrollableAncestor.scrollTop <= MODAL_SCROLL_TOLERANCE;
    },
    onStart: () => {
      const sheet = sheetRef.current;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

      layoutRef.current.viewportHeight = viewportHeight;
      layoutRef.current.modalHeight = sheet?.offsetHeight || viewportHeight || 1;
    },
    onMove: (metrics) => {
      if (metrics.deltaY <= 0 || !sheetRef.current) {
        return;
      }

      if (prefersReducedMotion) {
        return;
      }

      clearTimers();
      const viewportHeight = layoutRef.current.viewportHeight || window.innerHeight || document.documentElement.clientHeight || 0;
      const modalHeight = layoutRef.current.modalHeight || viewportHeight || 1;
      const resistanceLimit = viewportHeight * 0.6;
      const translateY = metrics.deltaY <= resistanceLimit
        ? metrics.deltaY
        : resistanceLimit + ((metrics.deltaY - resistanceLimit) * MODAL_RESISTANCE_FACTOR);
      const progress = clamp(translateY / modalHeight, 0, 1);

      isAnimatingRef.current = true;
      applyOverlayOpacity(1 - progress);
      applySheetState(
        translateY,
        MODAL_HANDLE_BASE_WIDTH + ((MODAL_HANDLE_DRAG_WIDTH - MODAL_HANDLE_BASE_WIDTH) * progress),
      );
    },
    onEnd: (metrics) => {
      const sheet = sheetRef.current;
      if (!sheet || metrics.deltaY <= 0) {
        clearInlineStyles();
        return;
      }

      const viewportHeight = layoutRef.current.viewportHeight || window.innerHeight || document.documentElement.clientHeight || 0;
      const modalHeight = layoutRef.current.modalHeight || sheet.offsetHeight || viewportHeight || 1;
      const resistanceLimit = viewportHeight * 0.6;
      const translateY = metrics.deltaY <= resistanceLimit
        ? metrics.deltaY
        : resistanceLimit + ((metrics.deltaY - resistanceLimit) * MODAL_RESISTANCE_FACTOR);
      const progress = clamp(translateY / modalHeight, 0, 1);
      const shouldDismiss = progress > MODAL_DISMISS_THRESHOLD || metrics.velocityY > MODAL_DISMISS_VELOCITY;

      if (prefersReducedMotion) {
        clearInlineStyles();
        if (shouldDismiss) {
          onClose();
        }
        return;
      }

      clearTimers();

      if (!shouldDismiss) {
        animateBackToRest();
        return;
      }

      const duration = getModalDismissDuration(metrics.velocityY);
      isAnimatingRef.current = true;
      applyOverlayOpacity(0, `opacity ${duration}ms cubic-bezier(0.32, 0.72, 0, 1)`);
      applySheetState(
        (window.innerHeight || modalHeight) * 1.2,
        MODAL_HANDLE_DRAG_WIDTH,
        `transform ${duration}ms cubic-bezier(0.32, 0.72, 0, 1)`,
      );

      animationTimeoutRef.current = window.setTimeout(() => {
        clearInlineStyles();
        animationTimeoutRef.current = null;
        onClose();
      }, duration);
    },
    onCancel: () => {
      if (prefersReducedMotion) {
        clearInlineStyles();
        return;
      }

      animateBackToRest();
    },
  }).bind;

  const clearTimers = useCallback(() => {
    if (animationTimeoutRef.current !== null) {
      window.clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }

    if (resetTimeoutRef.current !== null) {
      window.clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
  }, []);

  const applyOverlayOpacity = useCallback((opacity: number, transition?: string) => {
    const overlay = overlayRef.current;
    if (!overlay) {
      return;
    }

    if (overlayMode === 'dialog-backdrop') {
      overlay.style.setProperty('--modal-backdrop-opacity', String(opacity));
      if (transition) {
        overlay.style.setProperty('--modal-backdrop-transition', transition);
      } else {
        overlay.style.removeProperty('--modal-backdrop-transition');
      }
      return;
    }

    overlay.style.opacity = String(opacity);
    overlay.style.willChange = transition ? 'opacity' : '';
    if (transition) {
      overlay.style.transition = transition;
    } else {
      overlay.style.removeProperty('transition');
    }
  }, [overlayMode, overlayRef]);

  const applySheetState = useCallback((translateY: number, handleWidth: number, transition?: string) => {
    const sheet = sheetRef.current;
    if (!sheet) {
      return;
    }

    sheet.style.transform = `translate3d(0, ${translateY}px, 0)`;
    sheet.style.setProperty('--sheet-handle-width', `${handleWidth}px`);
    sheet.style.willChange = transition ? 'transform' : 'transform';
    if (transition) {
      sheet.style.transition = transition;
    } else {
      sheet.style.removeProperty('transition');
    }
  }, [sheetRef]);

  const clearInlineStyles = useCallback(() => {
    const overlay = overlayRef.current;
    const sheet = sheetRef.current;

    if (overlay) {
      if (overlayMode === 'dialog-backdrop') {
        overlay.style.removeProperty('--modal-backdrop-opacity');
        overlay.style.removeProperty('--modal-backdrop-transition');
      } else {
        overlay.style.removeProperty('opacity');
        overlay.style.removeProperty('transition');
        overlay.style.removeProperty('will-change');
      }
    }

    if (sheet) {
      sheet.style.removeProperty('transform');
      sheet.style.removeProperty('transition');
      sheet.style.removeProperty('will-change');
      sheet.style.removeProperty('--sheet-handle-width');
    }

    isAnimatingRef.current = false;
  }, [overlayMode, overlayRef, sheetRef]);

  const animateBackToRest = useCallback(() => {
    const sheet = sheetRef.current;
    if (!sheet) {
      clearInlineStyles();
      return;
    }

    isAnimatingRef.current = true;
    applyOverlayOpacity(1, 'opacity 320ms cubic-bezier(0.34, 1.56, 0.64, 1)');
    applySheetState(0, MODAL_HANDLE_BASE_WIDTH, 'transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)');

    resetTimeoutRef.current = window.setTimeout(() => {
      clearInlineStyles();
      resetTimeoutRef.current = null;
    }, 320);
  }, [applyOverlayOpacity, applySheetState, clearInlineStyles, sheetRef]);

  useEffect(() => {
    if (!visible || !enabled) {
      unbindRef.current?.();
      unbindRef.current = null;
      clearTimers();
      clearInlineStyles();
      return;
    }

    const sheet = sheetRef.current;
    if (!sheet) {
      return;
    }

    unbindRef.current?.();
    unbindRef.current = bind(sheet);

    return () => {
      unbindRef.current?.();
      unbindRef.current = null;
      clearTimers();
      clearInlineStyles();
    };
  }, [bind, clearInlineStyles, clearTimers, enabled, sheetRef, visible]);
}
