import { useRef } from 'react';
import { usePwaPullToRefreshGuard } from '../../hooks/usePwaPullToRefreshGuard';
import './PageWrapper.css';

interface PageWrapperProps {
  children: React.ReactNode;
  scrollable?: boolean;
  className?: string;
}

export default function PageWrapper({
  children,
  scrollable = true,
  className = '',
}: PageWrapperProps) {
  const wrapperRef = useRef<HTMLElement | null>(null);

  usePwaPullToRefreshGuard(wrapperRef, scrollable);

  return (
    <main
      ref={wrapperRef}
      className={[
        'page-wrapper',
        scrollable ? 'page-wrapper--scroll' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </main>
  );
}
