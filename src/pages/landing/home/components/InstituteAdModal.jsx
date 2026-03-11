/**
 * Institute ad modal: image only at ~80% viewport, no white card.
 * X is fixed on the overlay so it stays visible on any image size.
 */
export default function InstituteAdModal({ open, onClose, ad }) {
  if (!open || !ad) return null;

  const { imageUrl, linkUrl } = ad;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Close advertisement"
    >
      {/* X: fixed to viewport corner so always visible; not inside image box */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="fixed top-4 right-4 z-[201] w-11 h-11 flex items-center justify-center rounded-full bg-black/55 text-white text-2xl leading-none shadow-lg hover:bg-black/75 transition-colors border border-white/20"
        aria-label="Close"
      >
        ×
      </button>

      {/* Image only — no white/slate background; different aspect ratios show as-is on dark overlay */}
      <div
        className="relative flex items-center justify-center max-w-[80vw] max-h-[80vh] w-full h-full min-h-0 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {linkUrl ? (
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex max-w-full max-h-full items-center justify-center"
          >
            <img
              src={imageUrl}
              alt=""
              className="max-w-[80vw] max-h-[80vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
            />
          </a>
        ) : (
          <img
            src={imageUrl}
            alt=""
            className="max-w-[80vw] max-h-[80vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
          />
        )}
      </div>
    </div>
  );
}
