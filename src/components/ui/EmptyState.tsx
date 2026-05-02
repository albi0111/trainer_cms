import './EmptyState.css';

interface EmptyStateProps {
  icon?: React.ReactNode;
  message: string;
}

function resolveIcon(message: string): React.ReactNode {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('session')) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    );
  }

  if (normalizedMessage.includes('plan')) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10v4" />
        <path d="M6 8v8" />
        <path d="M18 8v8" />
        <path d="M21 10v4" />
        <path d="M6 12h12" />
      </svg>
    );
  }

  if (normalizedMessage.includes('client')) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }

  if (normalizedMessage.includes('exercise')) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 18h12M12 22v-4M12 2v4M2 12h4M18 12h4" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

export default function EmptyState({ icon, message }: EmptyStateProps) {
  const resolvedIcon = icon ?? resolveIcon(message);

  return (
    <div className="empty-state">
      <span className="empty-state__icon">{resolvedIcon}</span>
      <p className="empty-state__text">{message}</p>
    </div>
  );
}
