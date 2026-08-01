import { Link } from 'react-router-dom';
import { HiSparkles } from 'react-icons/hi2';

/**
 * Gold celebratory offer chip for "Free Coding Classes".
 * @param {{ to: string, className?: string, size?: 'sm' | 'md', onClick?: () => void, fullWidth?: boolean, compact?: boolean }} props
 */
export default function FreeCodingClassesOfferLink({
  to,
  className = '',
  size = 'md',
  onClick,
  fullWidth = false,
  compact = false,
}) {
  const sizeClass = compact
    ? 'text-[11px] px-2.5 py-2 gap-1 min-h-[40px]'
    : size === 'sm'
      ? 'text-[11px] px-2.5 py-1.5 gap-1 min-h-[36px]'
      : 'text-xs sm:text-sm px-3 py-2 gap-1.5 min-h-[40px]';

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`nth-free-coding-offer group relative inline-flex shrink-0 items-center justify-center font-bold tracking-wide rounded-full overflow-hidden ${sizeClass} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      aria-label="Free Coding Classes"
      title="Free Coding Classes"
    >
      <HiSparkles className="relative z-10 h-3.5 w-3.5 shrink-0" aria-hidden />
      {compact ? (
        <span className="relative z-10 whitespace-nowrap">Classes</span>
      ) : (
        <>
          <span className="relative z-10 whitespace-nowrap">
            <span className="md:hidden">Free Classes</span>
            <span className="hidden md:inline">Free Coding Classes</span>
          </span>
          <span className="relative z-10 nth-free-coding-offer-badge shrink-0">HOT</span>
        </>
      )}
    </Link>
  );
}
