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
  return (
    <main
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
