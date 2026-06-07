import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

type CountUpEasing = 'linear' | 'ease-out' | 'spring';

type UseCountUpArgs = {
  target: number;
  duration?: number;
  delay?: number;
  easing?: CountUpEasing;
};

type UseCountUpResult = {
  current: number;
  isComplete: boolean;
};

const DEFAULT_DURATION = 600;
const DEFAULT_DELAY = 0;
const DEFAULT_EASING: CountUpEasing = 'ease-out';

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getAnimatedValue(startValue: number, target: number, progress: number, easing: CountUpEasing) {
  if (easing === 'linear') {
    return startValue + ((target - startValue) * progress);
  }

  if (easing === 'spring' && target > 0 && target >= startValue) {
    const overshootTarget = target * 1.08;

    if (progress <= 0.8) {
      const segmentProgress = progress / 0.8;
      const easedSegment = 1 - Math.pow(1 - segmentProgress, 3);
      return startValue + ((overshootTarget - startValue) * easedSegment);
    }

    const settleProgress = (progress - 0.8) / 0.2;
    const easedSettle = 1 - Math.pow(1 - settleProgress, 3);
    return overshootTarget + ((target - overshootTarget) * easedSettle);
  }

  const easedProgress = 1 - Math.pow(1 - progress, 3);
  return startValue + ((target - startValue) * easedProgress);
}

export default function useCountUp({
  target,
  duration = DEFAULT_DURATION,
  delay = DEFAULT_DELAY,
  easing = DEFAULT_EASING,
}: UseCountUpArgs): UseCountUpResult {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isDocumentVisible, setIsDocumentVisible] = useState(() => (
    typeof document === 'undefined' ? true : document.visibilityState !== 'hidden'
  ));
  const frameRef = useRef<number | null>(null);
  const delayTimeoutRef = useRef<number | null>(null);
  const currentValueRef = useRef(target === 0 ? 0 : 0);
  const [current, setCurrent] = useState(target === 0 ? 0 : 0);
  const [isComplete, setIsComplete] = useState(target === 0);

  useEffect(() => {
    currentValueRef.current = current;
  }, [current]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const syncVisibility = () => {
      setIsDocumentVisible(document.visibilityState !== 'hidden');
    };

    syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);

    return () => {
      document.removeEventListener('visibilitychange', syncVisibility);
    };
  }, []);

  useEffect(() => {
    const clearPendingWork = () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      if (delayTimeoutRef.current !== null) {
        window.clearTimeout(delayTimeoutRef.current);
        delayTimeoutRef.current = null;
      }
    };

    clearPendingWork();

    if (!isDocumentVisible) {
      return clearPendingWork;
    }

    if (target === 0 || prefersReducedMotion) {
      currentValueRef.current = target;
      setCurrent(target);
      setIsComplete(true);
      return clearPendingWork;
    }

    const startValue = currentValueRef.current;
    const safeDuration = Math.max(duration, 1);

    setIsComplete(false);

    const startAnimation = () => {
      let animationStartTime: number | null = null;

      const step = (timestamp: number) => {
        if (animationStartTime === null) {
          animationStartTime = timestamp;
        }

        const progress = clamp((timestamp - animationStartTime) / safeDuration, 0, 1);
        const nextValue = getAnimatedValue(startValue, target, progress, easing);
        const roundedValue = Math.round(nextValue);

        currentValueRef.current = roundedValue;
        setCurrent(roundedValue);

        if (progress < 1) {
          frameRef.current = window.requestAnimationFrame(step);
          return;
        }

        currentValueRef.current = target;
        setCurrent(target);
        setIsComplete(true);
        frameRef.current = null;
      };

      frameRef.current = window.requestAnimationFrame(step);
    };

    if (delay > 0) {
      delayTimeoutRef.current = window.setTimeout(() => {
        startAnimation();
        delayTimeoutRef.current = null;
      }, delay);
    } else {
      startAnimation();
    }

    return clearPendingWork;
  }, [delay, duration, easing, isDocumentVisible, prefersReducedMotion, target]);

  return { current, isComplete };
}
