import './Avatar.css';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  name: string;
  src?: string;
  size?: AvatarSize;
}

/**
 * Avatar — matches reference AvatarCircle exactly.
 * Gold background (#FFD700) with black text, first 2 chars as initials.
 */
export default function Avatar({ name, src, size = 'md' }: AvatarProps) {
  const initials = name.substring(0, 2).toUpperCase();

  return (
    <div className={`avatar avatar--${size}`} aria-label={name}>
      {src ? (
        <img src={src} alt={name} className="avatar__img" />
      ) : (
        <span className="avatar__initials">{initials}</span>
      )}
    </div>
  );
}
