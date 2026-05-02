import './IconButton.css';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  size?: 'sm' | 'md';
  variant?: 'default' | 'dark';
  label?: string;
}

/**
 * Circular icon-only button — the primary action pattern from the reference app.
 * 32×32 round button with 14px icon inside.
 */
export default function IconButton({
  icon,
  size = 'md',
  variant = 'default',
  label,
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      className={`icon-btn pressable icon-btn--${size} icon-btn--${variant} ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      {icon}
    </button>
  );
}
