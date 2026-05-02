import './TopNavBar.css';
import { useNavigate } from 'react-router-dom';
import { useHaptic } from '../../hooks/useHaptic';

interface TopNavBarProps {
  /** Content to render on the left side (e.g. back button) */
  leftContent?: React.ReactNode;
  /** Content to render on the right side (e.g. sync indicator) */
  rightContent?: React.ReactNode;
  /** Show FIT.PERSONA logo in center. Defaults to true. */
  showLogo?: boolean;
  /** Show back arrow on the left. Overridden by leftContent. */
  showBack?: boolean;
}

/**
 * TopNavBar — matches reference exactly.
 * Logo-centered with FIT mark.
 * Left/right slots for back button, sync indicator, etc.
 */
export default function TopNavBar({
  leftContent,
  rightContent,
  showLogo = true,
  showBack = false,
}: TopNavBarProps) {
  const navigate = useNavigate();
  const haptic = useHaptic();

  const handleBack = () => {
    haptic.light();

    const historyIndex = typeof window !== 'undefined'
      ? (window.history.state as { idx?: number } | null)?.idx ?? 0
      : 0;

    if (historyIndex > 0) {
      navigate(-1);
      return;
    }

    navigate('/');
  };

  const leftSlot = leftContent ?? (showBack ? (
    <button
      className="top-nav__back pressable"
      onClick={handleBack}
      aria-label="Go back"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  ) : null);

  return (
    <header className="top-nav app-header">
      <div className="top-nav__slot">{leftSlot}</div>
      {showLogo && (
        <div className="top-nav__logo" aria-label="FIT.PERSONA" role="img">
          <span className="top-nav__logo-badge">FIT</span>
          <span className="top-nav__logo-text">FIT.PERSONA</span>
        </div>
      )}
      <div className="top-nav__slot top-nav__slot--right">{rightContent ?? null}</div>
    </header>
  );
}
