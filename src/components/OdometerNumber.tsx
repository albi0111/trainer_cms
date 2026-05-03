import { useEffect, useMemo, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/useSwipeGesture';

const ODOMETER_EASING = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
const DIGIT_STAGGER_MS = 30;

export interface OdometerNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}

type DigitToken = {
  char: string;
  delayMs: number;
  key: string;
  type: 'digit' | 'static';
};

type ActiveDigitAnimation = {
  delayMs: number;
  duration: number;
  from: number;
  startTime: number;
  to: number;
};

interface OdometerDigitProps {
  delayMs: number;
  digit: number;
  duration: number;
  prefersReducedMotion: boolean;
}

function now(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
}

function getAnimatedPosition(animation: ActiveDigitAnimation | null, fallbackPosition: number): number {
  if (!animation) {
    return fallbackPosition;
  }

  const elapsed = now() - animation.startTime;
  if (elapsed <= animation.delayMs) {
    return animation.from;
  }

  const progress = Math.min((elapsed - animation.delayMs) / animation.duration, 1);
  const easedProgress = 1 - Math.pow(1 - progress, 3);

  if (progress >= 1) {
    return animation.to;
  }

  return animation.from + ((animation.to - animation.from) * easedProgress);
}

function createTokens(formattedValue: string): DigitToken[] {
  return formattedValue.split('').map((char, index, chars) => ({
    char,
    delayMs: /\d/.test(char) ? (chars.length - index - 1) * DIGIT_STAGGER_MS : 0,
    key: /\d/.test(char) ? `digit-${chars.length - index - 1}` : `static-${index}-${char}`,
    type: /\d/.test(char) ? 'digit' : 'static',
  }));
}

function OdometerDigit({
  delayMs,
  digit,
  duration,
  prefersReducedMotion,
}: OdometerDigitProps) {
  const animationRef = useRef<ActiveDigitAnimation | null>(null);
  const currentPositionRef = useRef(digit);
  const isFirstRenderRef = useRef(true);
  const rafIdRef = useRef<number | null>(null);
  const settleTimeoutRef = useRef<number | null>(null);
  const [renderPosition, setRenderPosition] = useState(digit);
  const [transition, setTransition] = useState('none');
  const [willChange, setWillChange] = useState<'transform' | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }

      if (settleTimeoutRef.current !== null) {
        window.clearTimeout(settleTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (settleTimeoutRef.current !== null) {
      window.clearTimeout(settleTimeoutRef.current);
      settleTimeoutRef.current = null;
    }

    const nextPosition = digit;

    if (isFirstRenderRef.current || prefersReducedMotion) {
      isFirstRenderRef.current = false;
      animationRef.current = null;
      currentPositionRef.current = nextPosition;
      setTransition('none');
      setRenderPosition(nextPosition);
      setWillChange(undefined);
      return;
    }

    const currentVisualPosition = getAnimatedPosition(animationRef.current, currentPositionRef.current);
    currentPositionRef.current = currentVisualPosition;
    animationRef.current = null;

    if (Math.abs(nextPosition - currentVisualPosition) < 0.001) {
      currentPositionRef.current = nextPosition;
      setTransition('none');
      setRenderPosition(nextPosition);
      setWillChange(undefined);
      return;
    }

    setTransition('none');
    setRenderPosition(currentVisualPosition);
    setWillChange('transform');

    rafIdRef.current = window.requestAnimationFrame(() => {
      const animationStartTime = now();
      animationRef.current = {
        delayMs,
        duration,
        from: currentVisualPosition,
        startTime: animationStartTime,
        to: nextPosition,
      };
      setTransition(`transform ${duration}ms ${ODOMETER_EASING} ${delayMs}ms`);
      setRenderPosition(nextPosition);

      settleTimeoutRef.current = window.setTimeout(() => {
        animationRef.current = null;
        currentPositionRef.current = nextPosition;
        setTransition('none');
        setWillChange(undefined);
        settleTimeoutRef.current = null;
      }, duration + delayMs + 48);
    });

    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      if (settleTimeoutRef.current !== null) {
        window.clearTimeout(settleTimeoutRef.current);
        settleTimeoutRef.current = null;
      }
    };
  }, [delayMs, digit, duration, prefersReducedMotion]);

  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        height: '1em',
        overflow: 'hidden',
        width: '0.68em',
      }}
    >
      <span
        style={{
          display: 'flex',
          flexDirection: 'column',
          transform: `translate3d(0, ${-renderPosition}em, 0)`,
          transition,
          willChange,
        }}
      >
        {Array.from({ length: 10 }).map((_, index) => (
          <span
            key={index}
            style={{
              alignItems: 'center',
              display: 'flex',
              height: '1em',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            {index}
          </span>
        ))}
      </span>
    </span>
  );
}

export default function OdometerNumber({
  value,
  duration = 500,
  decimals = 0,
  suffix,
  className,
}: OdometerNumberProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const tokens = useMemo(() => createTokens(value.toFixed(decimals)), [decimals, value]);

  return (
    <span
      className={className}
      style={{
        alignItems: 'baseline',
        display: 'inline-flex',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
      }}
    >
      {tokens.map((token) => {
        if (token.type === 'static') {
          return (
            <span
              key={token.key}
              style={{
                display: 'inline-flex',
                lineHeight: 1,
              }}
            >
              {token.char}
            </span>
          );
        }

        return (
          <OdometerDigit
            key={token.key}
            delayMs={token.delayMs}
            digit={Number.parseInt(token.char, 10)}
            duration={duration}
            prefersReducedMotion={prefersReducedMotion}
          />
        );
      })}

      {suffix ? (
        <span
          style={{
            display: 'inline-flex',
            lineHeight: 1,
            marginLeft: '0.18em',
          }}
        >
          {suffix}
        </span>
      ) : null}
    </span>
  );
}
