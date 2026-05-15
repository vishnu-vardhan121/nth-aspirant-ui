import { useEffect } from 'react';
import { HiXMark } from 'react-icons/hi2';
import HelpDeskForm from './HelpDeskForm';

export default function HelpDeskModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-120 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-md"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 text-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-desk-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <h2 id="help-desk-title" className="text-lg font-semibold">
              Help Desk
            </h2>
            <p className="mt-1 text-sm text-slate-300">Share your issue. Our team will contact you.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close help desk"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-5">
          <HelpDeskForm
            key={open ? 'open' : 'closed'}
            variant="dark"
            source="landing_page"
            submitLabel="Submit Issue"
            showCancel
            cancelLabel="Cancel"
            onCancel={onClose}
            onSuccess={onClose}
            successDisplay="none"
            idPrefix="help-desk-modal"
          />
        </div>
      </div>
    </div>
  );
}
