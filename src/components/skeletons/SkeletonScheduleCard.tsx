import { memo } from 'react';
import SkeletonBase from './SkeletonBase';

const SkeletonScheduleCard = memo(function SkeletonScheduleCard() {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-3xl)',
        padding: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <SkeletonBase width={14} height={14} radius={999} />
        <SkeletonBase width={108} height={12} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              borderRadius: 'var(--radius-xl)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <SkeletonBase width={48} height={48} radius={999} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <SkeletonBase width={120} height={16} />
              <SkeletonBase width={168} height={12} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default SkeletonScheduleCard;
