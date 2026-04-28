import './Avatar.css';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  name: string;
  src?: string;
  size?: AvatarSize;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

export default function Avatar({ name, src, size = 'md' }: AvatarProps) {
  return (
    <div className={`avatar avatar--${size}`} aria-label={name}>
      {src ? (
        <img src={src} alt={name} className="avatar__img" />
      ) : (
        <span className="avatar__initials">{getInitials(name)}</span>
      )}
    </div>
  );
}
