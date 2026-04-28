import './SectionHeader.css';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  actionContent?: React.ReactNode;
}

/**
 * Section header — gold dash + uppercase title + optional right action.
 * Matches the "— WORKOUT PLAN [+ Add Plan]" pattern from reference.
 */
export default function SectionHeader({
  title,
  actionLabel,
  onAction,
  actionContent,
}: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div className="section-header__left">
        <span className="section-header__dash">—</span>
        <span className="section-header__title">{title}</span>
      </div>
      {actionContent ??
        (actionLabel && onAction && (
          <button className="section-header__action" onClick={onAction}>
            {actionLabel}
          </button>
        ))}
    </div>
  );
}
