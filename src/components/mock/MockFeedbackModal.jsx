import { useEffect, useId, useState } from 'react';
import { HiCalendarDays, HiUserCircle, HiXMark } from 'react-icons/hi2';
import { ButtonLoader } from '../ui/Loader';
import MockFeedbackForm, { createEmptyMockFeedbackForm } from './MockFeedbackForm';
import { validateMockFeedbackForm } from '../../lib/mockFeedback';

export { createEmptyMockFeedbackForm };

function formatScheduled(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? null
    : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function MockFeedbackModal({
  open,
  onClose,
  registration,
  value,
  onChange,
  onSubmit,
  submitting = false,
  title = 'Submit mock feedback',
  submitLabel = 'Submit & mark completed',
}) {
  const formId = useId().replace(/:/g, '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  useEffect(() => {
    if (open) setError('');
  }, [open]);

  if (!open || !registration) return null;

  const aspirantLabel = registration.aspirant_name || registration.aspirant_email || 'Student';
  const scheduledLabel = formatScheduled(registration.scheduled_at);

  const handleSubmit = (form) => {
    const err = validateMockFeedbackForm(form);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    onSubmit?.(form);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center overflow-hidden bg-slate-950/55 p-0 sm:items-center sm:p-4"
      onClick={submitting ? undefined : onClose}
      role="presentation"
    >
      <div
        className="flex h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:h-auto sm:max-h-[min(90dvh,720px)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mock-feedback-modal-title"
      >
        <header className="shrink-0 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Mock feedback</p>
              <h2 id="mock-feedback-modal-title" className="mt-0.5 truncate text-lg font-bold text-slate-900">
                {title}
              </h2>
              <p className="mt-2 flex flex-col gap-1 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:gap-x-4">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <HiUserCircle className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <span className="truncate font-medium text-slate-800">{aspirantLabel}</span>
                </span>
                {scheduledLabel ? (
                  <span className="inline-flex items-center gap-1.5">
                    <HiCalendarDays className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    <span>{scheduledLabel}</span>
                  </span>
                ) : null}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              aria-label="Close"
            >
              <HiXMark className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="nth-scroll-y min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5">
          <MockFeedbackForm
            formId={formId}
            value={value}
            onChange={onChange}
            onSubmit={handleSubmit}
            showActions={false}
            onValidationError={setError}
          />
          {error ? (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex gap-2 sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:flex-none sm:px-5"
            >
              Cancel
            </button>
            <button
              type="submit"
              form={formId}
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-60 sm:flex-none sm:px-5"
            >
              {submitting ? <ButtonLoader /> : null}
              {submitLabel}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
