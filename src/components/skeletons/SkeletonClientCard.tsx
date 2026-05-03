import SkeletonBase from './SkeletonBase';

export default function SkeletonClientCard() {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border-card)',
        borderRadius: 'var(--radius-3xl)',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      <SkeletonBase width={48} height={48} radius={999} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <SkeletonBase width={140} height={16} />
        <SkeletonBase width={80} height={12} />
        <SkeletonBase width={60} height={20} radius={999} />
      </div>
      <SkeletonBase width={18} height={18} radius={999} />
    </div>
  );
}
