/**
 * Shared layout: max-width + responsive horizontal padding for alignment.
 * useGrid: use 12-column grid for landing sections (except hero).
 */
export default function SectionContainer({ children, className = '', useGrid = false }) {
  return (
    <div
      className={`max-w-6xl mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 ${useGrid ? 'nth-section-grid' : ''} ${className}`}
      style={{ maxWidth: 'var(--nth-section-max-width, 72rem)' }}
    >
      {children}
    </div>
  );
}
