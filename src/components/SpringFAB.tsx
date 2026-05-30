import { type MouseEvent as ReactMouseEvent, type ReactNode, useEffect, useRef, useState } from 'react';

type SpringFABProps = {
  onClick: () => void;
  children: ReactNode;
  className?: string;
};

const PRESS_DURATION_MS = 120;
const TOUCH_MOUSE_GUARD_MS = 450;
const SPRING_FAB_STYLES = `
  .spring-fab {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    padding: 0;
    border: 0;
    border-radius: 22px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.02)),
      var(--color-primary);
    color: #050505;
    box-shadow:
      0 20px 34px -20px rgba(var(--color-primary-rgb), 0.85),
      inset 0 1px 0 rgba(255, 255, 255, 0.28);
    appearance: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    transform: translateZ(0) scaleX(1) scaleY(1);
    transition: transform ${PRESS_DURATION_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
    backface-visibility: hidden;
  }

  .spring-fab__content {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transform: rotate(0deg);
    transition: transform ${PRESS_DURATION_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
    backface-visibility: hidden;
  }

  .spring-fab--press {
    transform: translateZ(0) scaleX(1.18) scaleY(0.82);
  }

  .spring-fab--press .spring-fab__content {
    transform: rotate(8deg);
  }

  .spring-fab--release {
    animation: spring-fab-release 480ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  .spring-fab--release .spring-fab__content {
    animation: spring-fab-icon-release 480ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  @keyframes spring-fab-release {
    0% {
      transform: translateZ(0) scaleX(1.18) scaleY(0.82);
    }

    25% {
      transform: translateZ(0) scaleX(0.88) scaleY(1.15);
    }

    50% {
      transform: translateZ(0) scaleX(1.06) scaleY(0.96);
    }

    75% {
      transform: translateZ(0) scaleX(0.98) scaleY(1.02);
    }

    100% {
      transform: translateZ(0) scaleX(1) scaleY(1);
    }
  }

  @keyframes spring-fab-icon-release {
    0% {
      transform: rotate(8deg);
    }

    25% {
      transform: rotate(-5deg);
    }

    50% {
      transform: rotate(2deg);
    }

    75% {
      transform: rotate(-1deg);
    }

    100% {
      transform: rotate(0deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .spring-fab {
      transition:
        opacity ${PRESS_DURATION_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
        transform 0ms linear;
    }

    .spring-fab--press {
      transform: none;
      opacity: 0.7;
    }

    .spring-fab--release,
    .spring-fab--release .spring-fab__content,
    .spring-fab--press .spring-fab__content {
      animation: none !important;
      transform: none !important;
    }
  }
`;

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

export default function SpringFAB({ onClick, children, className }: SpringFABProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const isPressedRef = useRef(false);
  const isAnimatingRef = useRef(false);
  const ignoreMouseRef = useRef(false);
  const allowClickRef = useRef(false);
  const touchGuardTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (touchGuardTimeoutRef.current !== null) {
        window.clearTimeout(touchGuardTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const button = buttonRef.current;
    const content = contentRef.current;
    if (!button || !content) {
      return;
    }

    const clearWillChange = () => {
      button.style.willChange = '';
      content.style.willChange = '';
    };

    const resetTouchGuard = () => {
      if (touchGuardTimeoutRef.current !== null) {
        window.clearTimeout(touchGuardTimeoutRef.current);
      }

      touchGuardTimeoutRef.current = window.setTimeout(() => {
        ignoreMouseRef.current = false;
        touchGuardTimeoutRef.current = null;
      }, TOUCH_MOUSE_GUARD_MS);
    };

    const cancelPress = () => {
      allowClickRef.current = false;
      isPressedRef.current = false;
      isAnimatingRef.current = false;
      button.classList.remove('spring-fab--press');
      button.classList.remove('spring-fab--release');
      clearWillChange();
    };

    const beginPress = (source: 'mouse' | 'touch') => {
      if (source === 'mouse' && ignoreMouseRef.current) {
        return;
      }

      if (isAnimatingRef.current || isPressedRef.current) {
        return;
      }

      isPressedRef.current = true;
      allowClickRef.current = true;
      button.classList.remove('spring-fab--release');
      button.style.willChange = prefersReducedMotion ? 'opacity' : 'transform';
      content.style.willChange = prefersReducedMotion ? '' : 'transform';
      button.classList.add('spring-fab--press');
    };

    const releasePress = () => {
      if (!isPressedRef.current) {
        return;
      }

      isPressedRef.current = false;
      button.classList.remove('spring-fab--press');

      if (prefersReducedMotion) {
        clearWillChange();
        return;
      }

      isAnimatingRef.current = true;
      button.classList.add('spring-fab--release');
    };

    const handleAnimationEnd = (event: AnimationEvent) => {
      if (event.animationName !== 'spring-fab-release') {
        return;
      }

      isAnimatingRef.current = false;
      button.classList.remove('spring-fab--release');
      clearWillChange();
    };

    const handleTouchStart = () => {
      ignoreMouseRef.current = true;
      resetTouchGuard();
      beginPress('touch');
    };

    const handleTouchEnd = () => {
      resetTouchGuard();
      releasePress();
    };

    const handleTouchCancel = () => {
      resetTouchGuard();
      cancelPress();
    };

    const handleMouseDown = () => {
      beginPress('mouse');
    };

    const handleMouseUp = () => {
      releasePress();
    };

    const handleScroll = () => {
      if (isPressedRef.current) {
        cancelPress();
      }
    };

    button.addEventListener('touchstart', handleTouchStart, { passive: true });
    button.addEventListener('touchend', handleTouchEnd, { passive: true });
    button.addEventListener('touchcancel', handleTouchCancel, { passive: true });
    button.addEventListener('mousedown', handleMouseDown);
    button.addEventListener('blur', cancelPress);
    button.addEventListener('animationend', handleAnimationEnd);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      button.removeEventListener('touchstart', handleTouchStart);
      button.removeEventListener('touchend', handleTouchEnd);
      button.removeEventListener('touchcancel', handleTouchCancel);
      button.removeEventListener('mousedown', handleMouseDown);
      button.removeEventListener('blur', cancelPress);
      button.removeEventListener('animationend', handleAnimationEnd);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [prefersReducedMotion]);

  const mergedClassName = ['spring-fab', className].filter(Boolean).join(' ');

  const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (event.detail === 0) {
      onClick();
      return;
    }

    if (!allowClickRef.current) {
      return;
    }

    allowClickRef.current = false;
    onClick();
  };

  return (
    <>
      <style>{SPRING_FAB_STYLES}</style>
      <button ref={buttonRef} type="button" className={mergedClassName} onClick={handleClick}>
        <span ref={contentRef} className="spring-fab__content">
          {children}
        </span>
      </button>
    </>
  );
}
