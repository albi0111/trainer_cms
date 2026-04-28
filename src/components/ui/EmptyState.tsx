import './EmptyState.css';

interface EmptyStateProps {
  icon?: React.ReactNode;
  message: string;
}

/**
 * EmptyState — matches reference exactly.
 * Minimal: just italic text + optional icon. No big titles or action buttons.
 */
export default function EmptyState({ icon, message }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon && <span className="empty-state__icon">{icon}</span>}
      <p className="empty-state__text">{message}</p>
    </div>
  );
}
