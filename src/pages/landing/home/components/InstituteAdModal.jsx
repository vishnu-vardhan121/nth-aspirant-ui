/**
 * Institute / training platform ad modal for the landing page.
 * Modal is ~80% of viewport; poster fits inside with object-contain.
 */
export default function InstituteAdModal({ open, onClose, ad }) {
  if (!open || !ad) return null;

  const { imageUrl, linkUrl, sponsorLabel } = ad;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Sponsored"
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col w-[80vw] max-w-[80vw] h-[80vh] max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {sponsorLabel && (
          <div className="shrink-0 px-4 py-2 border-b border-slate-100 flex items-center justify-center">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {sponsorLabel}
            </span>
          </div>
        )}

        <div className="flex flex-1 min-h-0 items-center justify-center bg-slate-50 p-3 sm:p-4">
          {linkUrl ? (
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full h-full min-h-0 items-center justify-center"
            >
              <img
                src={imageUrl}
                alt=""
                className="max-w-full max-h-full w-auto h-auto object-contain"
              />
            </a>
          ) : (
            <img
              src={imageUrl}
              alt=""
              className="max-w-full max-h-full w-auto h-auto object-contain"
            />
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center rounded-lg bg-white/90 shadow-sm text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
}
