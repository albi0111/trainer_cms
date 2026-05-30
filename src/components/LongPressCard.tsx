import { useMemo, type ReactNode } from 'react';
import { useLongPress } from '../hooks/useLongPress';
import './LongPressCard.css';

interface LongPressCardProps {
  onLongPress: () => void;
  children: ReactNode;
  className?: string;
}

export default function LongPressCard({ onLongPress, children, className = '' }: LongPressCardProps) {
  const { handlers, progress, isHolding } = useLongPress({ onLongPress });
  const isActive = progress > 0 || isHolding;

  const surfaceStyle = useMemo(() => {
    const borderOpacity = progress > 0 ? 0.25 + (progress * 0.75) : 0;
    const glowStrong = 0.24 * progress;
    const glowSoft = 0.09 * progress;
    const scale = 1 - (progress * 0.01);

    return {
      borderColor: isActive ? `rgba(var(--color-primary-rgb), ${borderOpacity})` : undefined,
      boxShadow: isActive
        ? `0 0 0 ${2.5 * progress}px rgba(var(--color-primary-rgb), ${glowStrong}), 0 0 18px ${4 * progress}px rgba(var(--color-primary-rgb), ${glowSoft})`
        : undefined,
      transform: `scale(${scale})`,
      ['--long-press-overlay-opacity' as const]: String(progress * 0.045),
    };
  }, [isHolding, progress]);

  return (
    <div
      className={`long-press-card pressable ${className}`.trim()}
      data-holding={isActive ? 'true' : 'false'}
      style={surfaceStyle}
      {...handlers}
    >
      <div className="long-press-card__overlay" aria-hidden="true" />
      {children}
    </div>
  );
}
