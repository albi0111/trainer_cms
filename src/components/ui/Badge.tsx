import './Badge.css';

export type BadgeVariant = 'active' | 'completed' | 'on-hold' | 'pending';

interface BadgeProps {
  variant?: BadgeVariant;
  label?: string;
  children?: React.ReactNode;
}

const BADGE_DEFAULTS: Record<BadgeVariant, string> = {
  active: 'Active',
  completed: 'Completed',
  'on-hold': 'On Hold',
  pending: 'Pending',
};

export default function Badge({ variant = 'active', label, children }: BadgeProps) {
  return (
    <span className={`badge badge--${variant}`}>
      {children ?? label ?? BADGE_DEFAULTS[variant]}
    </span>
  );
}
