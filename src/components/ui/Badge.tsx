import './Badge.css';

export type BadgeVariant = 'active' | 'inactive' | 'warning' | 'success';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export default function Badge({ variant = 'active', children }: BadgeProps) {
  return (
    <span className={`badge badge--${variant}`}>{children}</span>
  );
}
