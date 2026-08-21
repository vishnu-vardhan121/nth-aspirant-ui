import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HiCheckBadge, HiClock } from 'react-icons/hi2';

/**
 * Professional confirmation after aspirant submits a request awaiting staff approval.
 */
export default function RequestSubmittedModal({
  open,
  onClose,
  title = 'Request submitted',
  body = 'Our team will review your request within 48 hours. Please check the app for updates.',
  hours = 48,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[250] flex items-end justify-center bg-slate-900/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-submitted-title"
        className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/25 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-slate-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/dark-logo.png"
              alt="Naveen Talent Hub"
              className="h-8 w-auto object-contain"
            />
            <div className="min-w-0 border-l border-indigo-200/80 pl-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600">
                Naveen Talent Hub
              </p>
              <p className="text-xs text-slate-500">Request received</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-6 text-center sm:px-6">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60">
            <HiCheckBadge className="h-8 w-8" aria-hidden />
          </span>
          <h2
            id="request-submitted-title"
            className="mt-4 text-xl font-bold tracking-tight text-slate-900"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3.5 text-left">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm ring-1 ring-amber-100">
              <HiClock className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-950">
                Approval within {hours} hours
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-900/80">
                Please check the app for updates. We’ll notify you here once your request is
                reviewed.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            Okay
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
