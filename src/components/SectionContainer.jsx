/**
 * Shared layout: max-width + responsive horizontal padding for alignment.
 * useGrid: use 12-column grid for landing sections (except hero).
 * wider: use larger max-width for xl+ screens (job openings, etc).
 */
export default function SectionContainer({ children, className = '', useGrid = false, wider = false }) {
  return (
    <div
      className={`mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 ${wider ? 'max-w-6xl xl:max-w-[88rem] 2xl:max-w-[96rem]' : 'max-w-6xl'} ${useGrid ? 'nth-section-grid' : ''} ${className}`}
      style={!wider ? { maxWidth: 'var(--nth-section-max-width, 72rem)' } : undefined}
    >
      {children}
    </div>
  );
}
