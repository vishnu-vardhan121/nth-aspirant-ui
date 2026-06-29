import { useEffect } from 'react';
import { HiCalendarDays, HiUserCircle, HiXMark } from 'react-icons/hi2';
import ViewCandidateProfileButton from '../interviewer/ViewCandidateProfileButton';
import MockChatPanel from './MockChatPanel';

function formatScheduled(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? null
    : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function MockChatModal({ open, onClose, registration }) {
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
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !registration) return null;

  const aspirantLabel = registration.aspirant_name || registration.aspirant_email || 'Aspirant';
  const scheduledLabel = formatScheduled(registration.scheduled_at);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center overflow-hidden bg-slate-950/55 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex h-[min(85dvh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mock-chat-modal-title"
      >
        <header className="shrink-0 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Mock chat</p>
              <h2 id="mock-chat-modal-title" className="mt-0.5 truncate text-lg font-bold text-slate-900">
                {aspirantLabel}
              </h2>
              <p className="mt-1.5 flex flex-col gap-1 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:gap-x-4">
                {registration.aspirant_email && registration.aspirant_name ? (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <HiUserCircle className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    <span className="truncate">{registration.aspirant_email}</span>
                  </span>
                ) : null}
                {scheduledLabel ? (
                  <span className="inline-flex items-center gap-1.5">
                    <HiCalendarDays className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    <span>{scheduledLabel}</span>
                  </span>
                ) : null}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <ViewCandidateProfileButton mockRegistrationId={registration.id} label="Profile" />
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <HiXMark className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <MockChatPanel
          mockRegistrationId={registration.id}
          aspirantName={registration.aspirant_name}
          aspirantEmail={registration.aspirant_email}
          scheduledAt={registration.scheduled_at}
          status={registration.status}
          showHeader={false}
          className="min-h-0 flex-1"
        />
      </div>
    </div>
  );
}
