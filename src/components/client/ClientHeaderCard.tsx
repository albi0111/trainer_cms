import './ClientHeaderCard.css';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import OdometerNumber from '../OdometerNumber';
import type { ClientStatus } from '../../types';
import { toClientBadgeStatus } from '../../utils/clientStatus';
import { getBpStatus, getBpStatusLabel } from '../../utils/bpStatus';

interface ClientHeaderCardProps {
  name: string;
  goal: string;
  age: number;
  weight: number;
  height: number;
  status: ClientStatus;
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
}

export default function ClientHeaderCard({
  name,
  goal,
  age,
  weight,
  height,
  status,
  bpSystolic,
  bpDiastolic,
}: ClientHeaderCardProps) {
  const bpStatus = getBpStatus(bpSystolic, bpDiastolic);

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

      {bpStatus ? (
        <div className="client-header-bp-row">
          <span className={`client-header-bp-badge client-header-bp-badge--${bpStatus}`}>
            {getBpStatusLabel(bpStatus)}: {bpSystolic}/{bpDiastolic}
          </span>
        </div>
      ) : null}

      <div className="client-stats-row">
        <div className="client-stat-item">
          <span className="client-stat-label">AGE</span>
          <OdometerNumber value={age} suffix="y" className="client-stat-value" />
        </div>
        <div className="client-stat-item">
          <span className="client-stat-label">WEIGHT</span>
          <OdometerNumber
            value={weight}
            decimals={Number.isInteger(weight) ? 0 : 1}
            suffix="kg"
            className="client-stat-value"
          />
        </div>
        <div className="client-stat-item">
          <span className="client-stat-label">HEIGHT</span>
          <OdometerNumber
            value={height}
            decimals={Number.isInteger(height) ? 0 : 1}
            suffix="cm"
            className="client-stat-value"
          />
        </div>
      </div>
    </div>
  );
}
