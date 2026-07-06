import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { HiCalendarDays, HiCheckCircle, HiClipboardDocumentCheck, HiUserCircle, HiXMark } from 'react-icons/hi2';
import ViewCandidateProfileButton from '../interviewer/ViewCandidateProfileButton';
import { ButtonLoader } from '../ui/Loader';
import MockFeedbackForm, { createEmptyMockFeedbackForm } from './MockFeedbackForm';
import { hasMockFeedbackDraft, validateMockFeedbackForm } from '../../lib/mockFeedback';

export { createEmptyMockFeedbackForm };

function formatScheduled(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? null
    : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function computeProgress(form) {
  const keys = form?.selectedKeys ?? [];
  let steps = 0;
  let done = 0;

  steps += 1;
  if (keys.length > 0) done += 1;

  steps += 1;
  if (keys.length > 0) {
    const allTopicsDone = keys.every((key) => {
      const row = form.topics?.[key];
      return row?.rating && row?.feedback?.trim()?.length >= 20;
    });
    if (allTopicsDone) done += 1;
  }

  steps += 1;
  if ((form?.feedback_notes?.trim()?.length ?? 0) >= 30) done += 1;

  return { done, steps, pct: steps ? Math.round((done / steps) * 100) : 0 };
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
  editing = false,
}) {
  const formId = useId().replace(/:/g, '');
  const [error, setError] = useState('');

  const progress = useMemo(() => computeProgress(value), [value]);

  const requestClose = useCallback(() => {
    if (submitting) return;
    if (hasMockFeedbackDraft(value)) {
      const ok = window.confirm('Discard your feedback? Unsaved changes will be lost.');
      if (!ok) return;
    }
    onClose?.();
  }, [submitting, value, onClose]);

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
      if (e.key === 'Escape' && !submitting) requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, requestClose]);

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
      className="fixed inset-0 z-[120] flex items-stretch justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4 lg:p-6"
      role="presentation"
    >
      <div
        className="flex h-full w-full max-w-5xl flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl sm:h-[min(96dvh,900px)] sm:max-h-[96dvh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mock-feedback-modal-title"
      >
        <header className="shrink-0 border-b border-slate-200 bg-linear-to-r from-indigo-50/90 via-white to-violet-50/50 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white sm:flex">
              <HiClipboardDocumentCheck className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Mock feedback report</p>
              <h2 id="mock-feedback-modal-title" className="mt-0.5 text-xl font-bold text-slate-900 sm:text-2xl">
                {title}
              </h2>
              <p className="mt-2 flex flex-col gap-1.5 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:gap-x-5">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <HiUserCircle className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
                  <span className="truncate font-medium text-slate-800">{aspirantLabel}</span>
                </span>
                {scheduledLabel ? (
                  <span className="inline-flex items-center gap-1.5">
                    <HiCalendarDays className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
                    <span>{scheduledLabel}</span>
                  </span>
                ) : null}
              </p>
              <div className="mt-4 max-w-md">
                <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-600">
                  <span>Form progress</span>
                  <span>{progress.pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${progress.pct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  Pick topics → feedback per topic → overall assessment
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <ViewCandidateProfileButton mockRegistrationId={registration.id} label="View profile" variant="outline" />
              <button
                type="button"
                onClick={requestClose}
                disabled={submitting}
                className="rounded-xl p-2.5 text-slate-500 hover:bg-white/80 hover:text-slate-800 disabled:opacity-50"
                aria-label="Close"
              >
                <HiXMark className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <div className="nth-scroll-y min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/40 px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto max-w-4xl">
            <MockFeedbackForm
              formId={formId}
              value={value}
              onChange={onChange}
              onSubmit={handleSubmit}
              showActions={false}
              onValidationError={setError}
              layout="modal"
            />
            {error ? (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 sm:max-w-sm">
              {editing ? (
                <>Saving updates the feedback on this mock and notifies the aspirant.</>
              ) : (
                <>
                  Submitting marks this mock as <strong className="font-semibold text-slate-700">completed</strong> and
                  sends feedback to the aspirant.
                </>
              )}
            </p>
            <div className="flex gap-2 sm:shrink-0">
              <button
                type="button"
                onClick={requestClose}
                disabled={submitting}
                className="flex-1 rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:flex-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                form={formId}
                disabled={submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60 sm:flex-none"
              >
                {submitting ? <ButtonLoader /> : <HiCheckCircle className="h-5 w-5" aria-hidden />}
                {submitLabel}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
