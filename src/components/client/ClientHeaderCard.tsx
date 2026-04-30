import './ClientHeaderCard.css';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import type { ClientStatus } from '../../types';
import { toClientBadgeStatus } from '../../utils/clientStatus';

interface ClientHeaderCardProps {
  name: string;
  goal: string;
  age: number;
  weight: number;
  height: number;
  status: ClientStatus;
}

export default function ClientHeaderCard({
  name,
  goal,
  age,
  weight,
  height,
  status,
}: ClientHeaderCardProps) {
  return (
    <div className="client-header-card">
      <div className="client-header-card__top">
        <Avatar name={name} size="lg" />
        <div className="client-header-card__main">
          <div className="name-badge-row">
            <h2 className="client-header-name">{name}</h2>
            <Badge variant={toClientBadgeStatus(status)} />
          </div>
          <p className="client-header-goal">{goal}</p>
        </div>
      </div>

      <div className="client-stats-row">
        <div className="client-stat-item">
          <span className="client-stat-label">AGE</span>
          <span className="client-stat-value">{age}y</span>
        </div>
        <div className="client-stat-item">
          <span className="client-stat-label">WEIGHT</span>
          <span className="client-stat-value">{weight} kg</span>
        </div>
        <div className="client-stat-item">
          <span className="client-stat-label">HEIGHT</span>
          <span className="client-stat-value">{height} cm</span>
        </div>
      </div>
    </div>
  );
}
