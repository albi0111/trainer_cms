import './Card.css';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  padding?: CardPadding;
  bordered?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({
  padding = 'md',
  bordered = false,
  children,
  className = '',
  onClick,
}: CardProps) {
  const isPressable = Boolean(onClick);

  const classes = [
    'card',
    isPressable ? 'pressable' : '',
    `card--pad-${padding}`,
    bordered ? 'card--bordered' : '',
    isPressable ? 'card--clickable' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {children}
    </div>
  );
}
