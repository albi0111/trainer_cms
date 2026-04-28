import { NavLink } from 'react-router-dom';
import './BottomNav.css';

const TABS = [
  {
    to: '/',
    label: 'Dashboard',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="2" y="2" width="8" height="8" rx="2" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" />
        <rect x="12" y="2" width="8" height="8" rx="2" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" />
        <rect x="2" y="12" width="8" height="8" rx="2" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" />
        <rect x="12" y="12" width="8" height="8" rx="2" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    to: '/schedule',
    label: 'Schedule',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="2" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" fill={active ? 'rgba(255,215,0,0.08)' : 'none'} />
        <path d="M7 2V6M15 2V6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M2 9H20" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    to: '/add-client',
    label: 'Add',
    icon: (_active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="9" fill="currentColor" />
        <path d="M11 7V15M7 11H15" stroke="#000" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/clients',
    label: 'Clients',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="8" cy="7" r="3" stroke="currentColor" strokeWidth="1.8" fill={active ? 'currentColor' : 'none'} />
        <circle cx="15" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M2 18c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M17 14c1.5.5 3 1.5 3 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="3" stroke="currentColor" strokeWidth="1.8" fill={active ? 'currentColor' : 'none'} />
        <path d="M11 2v2M11 18v2M2 11h2M18 11h2M4.22 4.22l1.42 1.42M16.36 16.36l1.42 1.42M4.22 17.78l1.42-1.42M16.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `bottom-nav__tab ${isActive ? 'bottom-nav__tab--active' : ''}`
          }
          aria-label={tab.label}
        >
          {({ isActive }) => (
            <>
              <span className="bottom-nav__icon">{tab.icon(isActive)}</span>
              <span className="bottom-nav__label">{tab.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
