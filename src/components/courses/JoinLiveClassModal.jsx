import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HiClipboardDocument, HiXMark } from 'react-icons/hi2';
import { useState } from 'react';

/**
 * Warn aspirants to join Zoom/Meet with their registered email
 * so attendance CSV matching can credit them later.
 */
export default function JoinLiveClassModal({ open, email, meetUrl, linkLabel, onClose }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setCopied(false);
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const displayEmail = String(email || '').trim();
  const openMeet = () => {
    if (!meetUrl) return;
    window.open(meetUrl, '_blank', 'noopener,noreferrer');
    onClose?.();
  };

  const copyEmail = async () => {
    if (!displayEmail) return;
    try {
      await navigator.clipboard.writeText(displayEmail);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[240] flex items-end justify-center bg-slate-900/55 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-class-email-title"
        className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h2 id="join-class-email-title" className="text-lg font-bold text-slate-900">
              Join with your NTH email
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Attendance is matched by email from the Zoom participants list. If you join with a
              different email, you may be marked absent.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-5 sm:px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-700">
              Please log in to Zoom with
            </p>
            {displayEmail ? (
              <div className="mt-1.5 flex items-center gap-2">
                <p className="min-w-0 break-all text-base font-bold text-indigo-950">{displayEmail}</p>
                <button
                  type="button"
                  onClick={copyEmail}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-50"
                >
                  <HiClipboardDocument className="h-4 w-4" aria-hidden />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            ) : (
              <p className="mt-1.5 text-sm font-medium text-amber-900">
                No email on your profile — add it under My Profile, or attendance may not sync.
              </p>
            )}
          </div>

          <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-slate-600">
            <li>Open Zoom and sign in with the email above.</li>
            <li>Then join the live class from the button below.</li>
            <li>Guests without that email usually won&apos;t appear for attendance.</li>
          </ul>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={openMeet}
              disabled={!meetUrl}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {linkLabel || 'I’ve joined with this email — Open class'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
