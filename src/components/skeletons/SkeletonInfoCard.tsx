import { memo } from 'react';
import SkeletonBase from './SkeletonBase';

const SkeletonInfoCard = memo(function SkeletonInfoCard() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        backgroundColor: '#181818',
        border: '1px solid #262626',
        borderRadius: 'var(--radius-2xl)',
        padding: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <SkeletonBase width={18} height={18} radius={999} />
        <SkeletonBase width={100} height={12} />
      </div>

      {Array.from({ length: 2 }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '20px 16px',
          }}
        >
          {Array.from({ length: 2 }).map((__, columnIndex) => (
            <div key={columnIndex} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <SkeletonBase width={54} height={10} />
              <SkeletonBase width={118} height={16} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
});

export default SkeletonInfoCard;
