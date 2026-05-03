import SkeletonBase from './SkeletonBase';

export default function SkeletonStatCard() {
  return (
    <div
      style={{
        flex: 1,
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-3xl)',
        padding: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <SkeletonBase width={14} height={14} radius={999} />
        <SkeletonBase width={60} height={10} />
      </div>
      <SkeletonBase width={40} height={36} radius={6} />
      <div style={{ marginTop: '6px' }}>
        <SkeletonBase width={70} height={10} />
      </div>
    </div>
  );
}
