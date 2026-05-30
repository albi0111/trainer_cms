import { memo } from 'react';
import SkeletonBase from './SkeletonBase';

const SkeletonClientProfile = memo(function SkeletonClientProfile() {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface-dark)',
        border: '1px solid var(--color-border-container)',
        borderRadius: 'var(--radius-2xl)',
        padding: '20px',
        marginBottom: '16px',
      }}
    >
      <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', alignItems: 'center' }}>
        <SkeletonBase width={64} height={64} radius={999} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <SkeletonBase width={160} height={20} />
          <SkeletonBase width={80} height={14} />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '16px',
          paddingTop: '20px',
          borderTop: '1px solid var(--color-border-container)',
        }}
      >
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <SkeletonBase width={38} height={10} />
            <SkeletonBase width={72} height={16} />
          </div>
        ))}
      </div>
    </div>
  );
});

export default SkeletonClientProfile;
