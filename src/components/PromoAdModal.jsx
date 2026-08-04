/**
 * Promo popup — NTH indigo accent, content-first (compact brand strip).
 */
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiXMark } from 'react-icons/hi2';

function isInternalLink(url) {
  return typeof url === 'string' && url.startsWith('/');
}

function ClickHereButton({ linkUrl, onClose }) {
  const classes =
    'nth-btn-primary inline-flex min-h-11 w-full items-center justify-center rounded-xl px-5 py-3 text-sm no-underline';

  if (isInternalLink(linkUrl)) {
    return (
      <Link to={linkUrl} onClick={() => onClose?.()} className={classes}>
        Click here
      </Link>
    );
  }

  return (
    <a href={linkUrl} onClick={() => onClose?.()} className={classes}>
      Click here
    </a>
  );
}

export default function PromoAdModal({ open, onClose, ad }) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !ad) return null;

  const title = ad.title || '';
  const bodyText = ad.bodyText || '';
  const imageUrl = ad.imageUrl || '';
  const linkUrl = ad.linkUrl || '';
  const hasText = Boolean(title || bodyText);
  const hasImage = Boolean(imageUrl);
  const hasLink = Boolean(linkUrl);
  const imageOnly = hasImage && !hasText;

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center bg-slate-900/50 p-3 sm:p-6"
      onClick={() => onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-label={title || ad.name || 'Naveen Talent Hub notice'}
    >
      <div
        className={`pointer-events-auto relative ${
          imageOnly ? 'w-full max-w-[min(92vw,40rem)]' : 'w-full max-w-md'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {imageOnly ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
            <div className="flex items-center justify-between gap-3 border-b border-indigo-100 bg-indigo-50/80 px-4 py-2.5">
              <img src="/dark-logo.png" alt="Naveen Talent Hub" className="h-7 w-auto object-contain" />
              <button
                type="button"
                onClick={() => onClose?.()}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-800"
                aria-label="Close"
              >
                <HiXMark className="h-5 w-5" />
              </button>
            </div>
            {hasLink && isInternalLink(linkUrl) ? (
              <Link to={linkUrl} onClick={() => onClose?.()} className="block">
                <img
                  src={imageUrl}
                  alt={title || ad.name || ''}
                  className="max-h-[min(70vh,36rem)] w-full object-contain"
                />
              </Link>
            ) : hasLink ? (
              <a href={linkUrl} onClick={() => onClose?.()} className="block">
                <img
                  src={imageUrl}
                  alt={title || ad.name || ''}
                  className="max-h-[min(70vh,36rem)] w-full object-contain"
                />
              </a>
            ) : (
              <img
                src={imageUrl}
                alt={title || ad.name || ''}
                className="max-h-[min(70vh,36rem)] w-full object-contain"
              />
            )}
            {hasLink ? (
              <div className="flex justify-center border-t border-slate-100 px-4 py-3">
                <ClickHereButton linkUrl={linkUrl} onClose={onClose} />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
            {/* Slim brand bar — not a huge color block */}
            <div className="flex items-center justify-between gap-3 bg-linear-to-r from-indigo-600 to-violet-600 px-4 py-2.5">
              <img src="/white-logo.png" alt="Naveen Talent Hub" className="h-7 w-auto object-contain" />
              <button
                type="button"
                onClick={() => onClose?.()}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/85 transition hover:bg-white/15 hover:text-white"
                aria-label="Close"
              >
                <HiXMark className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
              {title ? (
                <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                  {title}
                </h2>
              ) : null}

              {hasImage ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="max-h-48 w-full rounded-xl border border-slate-100 object-contain"
                />
              ) : null}

              {bodyText ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                  {bodyText}
                </p>
              ) : null}

              {!title && !bodyText && !hasImage ? (
                <p className="text-sm text-slate-500">You have a new update from Naveen Talent Hub.</p>
              ) : null}

              <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:items-stretch">
                <button
                  type="button"
                  onClick={() => onClose?.()}
                  className="nth-btn-secondary inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold"
                >
                  Maybe later
                </button>
                {hasLink ? (
                  <div className="flex min-h-11 flex-1 [&>a]:min-h-11 [&>a]:w-full [&>a]:sm:min-w-0">
                    <ClickHereButton linkUrl={linkUrl} onClose={onClose} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
