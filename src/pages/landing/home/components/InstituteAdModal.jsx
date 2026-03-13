/**
 * Institute ad modal: image only at ~80% viewport, no white card.
 * X sits on the image wrapper so it stays at the image's top-right corner.
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
      <div
        className="relative flex items-center justify-center max-w-[80vw] max-h-[80vh] w-full h-full min-h-0 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative inline-flex max-w-full max-h-full items-start justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute right-3 top-3 z-[201] flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/55 text-[1.7rem] font-black leading-none text-white shadow-lg transition-colors hover:bg-black/75"
            aria-label="Close"
          >
            ×
          </button>

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
    </div>
  );
}
