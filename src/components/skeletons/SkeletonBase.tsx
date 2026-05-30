import { memo, useMemo } from 'react';
import type { CSSProperties } from 'react';

interface SkeletonBaseProps {
  width: number | string;
  height: number | string;
  radius?: number | string;
  style?: CSSProperties;
  className?: string;
}

const SKELETON_STYLE_ID = 'fit-persona-skeleton-styles';

function ensureSkeletonStyles(): void {
  if (typeof document === 'undefined') {
    return;
  }

  try {
    if (document.getElementById(SKELETON_STYLE_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = SKELETON_STYLE_ID;
    style.textContent = `
      .fp-skeleton-base {
        position: relative;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.06);
      }

      .fp-skeleton-base::after {
        content: '';
        position: absolute;
        inset: 0;
        background-image: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.04) 0%,
          rgba(255, 255, 255, 0.10) 50%,
          rgba(255, 255, 255, 0.04) 100%
        );
        background-size: 200% 100%;
        animation: fp-skeleton-shimmer 1.6s ease-in-out infinite;
      }

      @keyframes fp-skeleton-shimmer {
        from {
          background-position: 200% 0;
        }

        to {
          background-position: -200% 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .fp-skeleton-base::after {
          animation: none;
        }
      }
    `;

    document.head.appendChild(style);
  } catch {
    // Silent fail when the document head is unavailable.
  }
}

const SkeletonBase = memo(function SkeletonBase({
  width,
  height,
  radius = 6,
  style,
  className,
}: SkeletonBaseProps) {
  ensureSkeletonStyles();

  const mergedStyle = useMemo<CSSProperties>(() => ({
    width,
    height,
    borderRadius: radius,
    ...style,
  }), [height, radius, style, width]);

  return <div className={['fp-skeleton-base', className].filter(Boolean).join(' ')} style={mergedStyle} aria-hidden="true" />;
});

export default SkeletonBase;
