import { useEffect, type RefObject } from 'react';

const SCROLL_EDGE_TOLERANCE_PX = 1;

function supportsNativeOverscrollContain(): boolean {
  try {
    return typeof CSS !== 'undefined'
      && typeof CSS.supports === 'function'
      && CSS.supports('overscroll-behavior-y', 'contain');
  } catch {
    return false;
  }
}

function isScrollable(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const overflowY = style.overflowY;
  return (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
    && element.scrollHeight > element.clientHeight;
}

function canScrollInTouchDirection(element: HTMLElement, deltaY: number): boolean {
  if (!isScrollable(element)) {
    return false;
  }

  if (deltaY > 0) {
    return element.scrollTop > SCROLL_EDGE_TOLERANCE_PX;
  }

  if (deltaY < 0) {
    return element.scrollTop + element.clientHeight < element.scrollHeight - SCROLL_EDGE_TOLERANCE_PX;
  }

  return true;
}

function canAnyAncestorScroll(target: EventTarget | null, boundary: HTMLElement, deltaY: number): boolean {
  let current = target instanceof HTMLElement ? target : null;

  while (current) {
    if (canScrollInTouchDirection(current, deltaY)) {
      return true;
    }

    if (current === boundary) {
      break;
    }

    current = current.parentElement;
  }

  return canScrollInTouchDirection(boundary, deltaY);
}

export function usePwaPullToRefreshGuard(scrollerRef: RefObject<HTMLElement | null>, enabled: boolean): void {
  useEffect(() => {
    const scroller = scrollerRef.current;

    if (!enabled || !scroller || supportsNativeOverscrollContain()) {
      return;
    }

    let startY = 0;

    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      startY = touch?.clientY ?? 0;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];

      if (!touch || event.touches.length > 1) {
        return;
      }

      const deltaY = touch.clientY - startY;

      if (deltaY === 0 || canAnyAncestorScroll(event.target, scroller, deltaY)) {
        return;
      }

      event.preventDefault();
    };

    scroller.addEventListener('touchstart', handleTouchStart, { passive: true });
    scroller.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      scroller.removeEventListener('touchstart', handleTouchStart);
      scroller.removeEventListener('touchmove', handleTouchMove);
    };
  }, [enabled, scrollerRef]);
}
