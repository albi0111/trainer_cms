import './StatsCards.css';

interface StatsCardsProps {
  todaySessionCount: number;
  activeClientCount: number;
}

export default function StatsCards({
  todaySessionCount,
  activeClientCount,
}: StatsCardsProps) {
  return (
    <div className="stats-row">
      <div className="stat-card">
        <div className="stat-header">
          <svg className="stat-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 1V4M11 1V4M1 7H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="stat-title">TODAY</span>
        </div>
        <div className="stat-value">{todaySessionCount}</div>
        <div className="stat-sub">sessions</div>
      </div>
      <div className="stat-card">
        <div className="stat-header">
          <svg className="stat-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8Z" fill="currentColor" />
            <path d="M16 16C16 12.6863 12.4183 10 8 10C3.58172 10 0 12.6863 0 16H16Z" fill="currentColor" />
          </svg>
          <span className="stat-title">ACTIVE</span>
        </div>
        <div className="stat-value">{activeClientCount}</div>
        <div className="stat-sub">clients</div>
      </div>
    </div>
  );
}
