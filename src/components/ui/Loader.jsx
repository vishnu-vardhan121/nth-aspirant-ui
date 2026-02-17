/**
 * Reusable loaders – one theme (--nth-primary), multiple styles for different situations.
 *
 * 1. Loader (Spinner) – buttons, inline, compact areas
 * 2. LoaderDots – section/page loading, friendly feel
 * 3. LoaderPulse – lightweight “waiting” (e.g. connecting, modal)
 * 4. LoaderSkeleton – content placeholders (tables, cards)
 */

const sizeClasses = {
  xs: 'h-4 w-4 border-2',
  sm: 'h-6 w-6 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

const dotSizeClasses = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
};

/** 1. Spinner – rotating ring. Best for: buttons, inline, compact. */
export function Loader({ size = 'md', className = '' }) {
  return (
    <span
      className={`nth-loader inline-block rounded-full border-t-transparent animate-spin ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

/** 2. Dots – three bouncing dots. Best for: section load, chat load, friendly wait. */
export function LoaderDots({ size = 'md', className = '' }) {
  return (
    <span
      className={`inline-flex items-center justify-center gap-1.5 ${className}`}
      role="status"
      aria-label="Loading"
    >
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`nth-loader-dot rounded-full ${dotSizeClasses[size]}`}
        />
      ))}
    </span>
  );
}

/** 3. Pulse – single pulsing dot. Best for: “connecting”, lightweight modal/submit. */
export function LoaderPulse({ size = 'md', className = '' }) {
  const sizeMap = { xs: 'h-2 w-2', sm: 'h-3 w-3', md: 'h-4 w-4', lg: 'h-5 w-5' };
  return (
    <span
      className={`nth-loader-pulse inline-block rounded-full ${sizeMap[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

/** 4. Skeleton – shimmer bar(s). Best for: table rows, cards, content placeholders. */
export function LoaderSkeleton({
  className = '',
  lines = 1,
  height = 'h-4',
  width = 'w-full',
}) {
  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`nth-skeleton rounded ${height} ${i === lines - 1 && lines > 1 ? 'w-4/5' : width}`}
        />
      ))}
    </div>
  );
}

/**
 * Centered block for page/section. Uses spinner by default; pass variant for dots/pulse.
 * variant: 'spinner' | 'dots' | 'pulse'
 */
export function PageLoader({ size = 'lg', label = '', className = '', variant = 'spinner' }) {
  const LoaderComponent = variant === 'dots' ? LoaderDots : variant === 'pulse' ? LoaderPulse : Loader;
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <LoaderComponent size={size} />
      {label ? <p className="text-sm text-slate-500">{label}</p> : null}
    </div>
  );
}

/** Inline loader for buttons: small spinner + optional text. */
export function ButtonLoader({ label = '' }) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <Loader size="xs" />
      {label ? <span>{label}</span> : null}
    </span>
  );
}

/**
 * Table skeleton: N rows of shimmer bars. Use while table data is loading.
 */
export function TableSkeleton({ rows = 5, cols = 5, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3">
          {Array.from({ length: cols }, (_, colIndex) => (
            <div
              key={colIndex}
              className={`nth-skeleton rounded h-8 flex-1 ${colIndex === cols - 1 ? 'max-w-[20%]' : ''}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default Loader;
