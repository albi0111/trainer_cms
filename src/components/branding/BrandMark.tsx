import fitLogo from '../../../assets/fit.png';
import './BrandMark.css';

interface BrandMarkProps {
  className?: string;
  src?: string;
  alt?: string;
  decorative?: boolean;
  loading?: 'eager' | 'lazy';
}

export default function BrandMark({
  className = '',
  src = fitLogo,
  alt = 'fit.persona',
  decorative = false,
  loading = 'eager',
}: BrandMarkProps) {
  const resolvedClassName = ['brand-mark', className].filter(Boolean).join(' ');

  return (
    <img
      className={resolvedClassName}
      src={src}
      alt={decorative ? '' : alt}
      aria-hidden={decorative || undefined}
      loading={loading}
      decoding="async"
    />
  );
}
