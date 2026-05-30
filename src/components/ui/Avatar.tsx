import './Avatar.css';

type AvatarSize = 'sm' | 'md' | 'lg';
type AvatarVariant = 'default' | 'dark';

interface AvatarProps {
  name: string;
  src?: string;
  size?: AvatarSize;
  variant?: AvatarVariant;
}

/**
 * Avatar — matches reference AvatarCircle exactly.
 * Default: Gold background (var(--color-primary)) with black text.
 * Dark: Dark background (#262626) with gold text and border.
 */
export default function Avatar({ name, src, size = 'md', variant = 'default' }: AvatarProps) {
  const initials = name.substring(0, 2).toUpperCase();

  return (
    <div className={`avatar avatar--${size} avatar--${variant}`} aria-label={name}>
      {src ? (
        <img src={src} alt={name} className="avatar__img" />
      ) : (
        <span className="avatar__initials">{initials}</span>
      )}
    </div>
  );
}
