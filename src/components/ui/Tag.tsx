import './Tag.css';

type TagVariant = 'yellow' | 'gray';

interface TagProps {
  variant?: TagVariant;
  children: React.ReactNode;
}

/**
 * Tag / Pill — small label chips used in plan cards.
 * Yellow = goal/highlight tags, Gray = info/meta tags.
 */
export default function Tag({ variant = 'gray', children }: TagProps) {
  return (
    <span className={`tag tag--${variant}`}>{children}</span>
  );
}
