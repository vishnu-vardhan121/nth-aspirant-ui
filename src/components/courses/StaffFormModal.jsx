import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HiXMark } from 'react-icons/hi2';

/** Shared staff / aspirant bottom-sheet style modal shell. */
export default function StaffFormModal({
  open,
  title,
  subtitle,
  onClose,
  children,
  wide = false,
  /** checkout = Razorpay-style wide sheet (desktop: no inner scrollbar) */
  size = null,
  /** Show NTH logo in header (checkout / branded flows) */
  branded = false,
  headerAction = null,
  footer = null,
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

  const isCheckout = size === 'checkout';
  const widthClass = isCheckout
    ? 'max-w-5xl'
    : size === 'lg'
      ? 'max-w-xl'
      : wide
        ? 'max-w-lg'
        : 'max-w-md';

  return createPortal(
    <div
      className={`fixed inset-0 z-[240] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-[2px] sm:items-center ${
        isCheckout ? 'sm:p-6 lg:p-8' : 'sm:p-4'
      }`}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`relative flex w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/25 sm:rounded-2xl ${widthClass} ${
          isCheckout
            ? 'max-h-[100dvh] sm:max-h-[min(92vh,52rem)]'
            : 'max-h-[94vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-6 ${
            branded
              ? 'border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-slate-50'
              : 'border-slate-100 bg-white'
          }`}
        >
          <div className="min-w-0 flex-1">
            {branded ? (
              <div className="flex items-center gap-3">
                <img
                  src="/dark-logo.png"
                  alt="Naveen Talent Hub"
                  className="h-8 w-auto object-contain sm:h-9"
                />
                <div className="min-w-0 border-l border-indigo-200/80 pl-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600">
                    Secure checkout
                  </p>
                  {title ? (
                    <h2 className="truncate text-base font-bold text-slate-900 sm:text-lg">{title}</h2>
                  ) : null}
                  {subtitle ? (
                    <p className="mt-0.5 truncate text-sm text-slate-500">{subtitle}</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                {subtitle ? (
                  <p className="mt-0.5 text-sm leading-snug text-slate-500 [overflow-wrap:anywhere]">
                    {subtitle}
                  </p>
                ) : null}
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {headerAction}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              aria-label="Close"
            >
              <HiXMark className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div
          className={`min-h-0 flex-1 px-4 py-4 sm:px-6 sm:py-5 ${
            isCheckout
              ? 'overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:overflow-visible'
              : 'overflow-y-auto'
          }`}
        >
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
