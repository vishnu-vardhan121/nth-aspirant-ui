import { useEffect } from 'react';
import { HiXMark } from 'react-icons/hi2';
import HelpDeskForm from './HelpDeskForm';
import { useModalBackdropClose } from '../../../../hooks/useModalBackdropClose';

export default function HelpDeskModal({ open, onClose, source = 'landing_page', initialValues }) {
  const { backdropProps } = useModalBackdropClose(onClose);
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const subtitle =
    source === 'dashboard' || source === 'support_page'
      ? 'Replies appear in your Support inbox when you are signed in.'
      : 'Share your issue. Sign in with the same email to reply in Support.';

  return (
    <div
      className="fixed inset-0 z-120 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-md"
      {...backdropProps}
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
            <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
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
            source={source}
            initialValues={initialValues}
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
