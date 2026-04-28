import './TopNavBar.css';
import { useNavigate } from 'react-router-dom';

interface TopNavBarProps {
  title: string;
  showBack?: boolean;
  right?: React.ReactNode;
}

export default function TopNavBar({ title, showBack = false, right }: TopNavBarProps) {
  const navigate = useNavigate();

  return (
    <header className="top-nav">
      <div className="top-nav__left">
        {showBack && (
          <button
            className="top-nav__back"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
      <h1 className="top-nav__title">{title}</h1>
      <div className="top-nav__right">{right ?? null}</div>
    </header>
  );
}
