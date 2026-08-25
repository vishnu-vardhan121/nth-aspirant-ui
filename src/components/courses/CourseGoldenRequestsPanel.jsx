import { useCallback, useEffect, useState } from 'react';
import { HiCheckCircle, HiClipboardDocumentCheck, HiSparkles, HiXCircle } from 'react-icons/hi2';
import {
  formatCourseDate,
  staffListCourseGoldenRequests,
  staffPartialApproveCourseGolden,
  staffReviewCourseGolden,
} from '../../lib/courses';
import StaffFormModal from './StaffFormModal';

const ACTION_COPY = {
  approve: {
    title: 'Approve Golden access',
    cta: 'Confirm approve',
    placeholder: 'Why is this request approved?',
    button: 'bg-emerald-600 hover:bg-emerald-500',
  },
  reject: {
    title: 'Reject Golden request',
    cta: 'Confirm reject',
    placeholder: 'Why is this request rejected?',
    button: 'bg-red-600 hover:bg-red-500',
  },
  partial: {
    title: 'Partial approval (internal)',
    cta: 'Save partial approval',
    placeholder: 'Notes for the final reviewer — not shown to the aspirant.',
    button: 'bg-indigo-600 hover:bg-indigo-500',
  },
};

/**
 * Admin / interviewer: pending Golden access requests for a course.
 * Both roles can leave an internal "partial approval" (reason only, no access granted)
 * before either role makes the final approve/reject call (also reason-required).
 */
export default function CourseGoldenRequestsPanel({
  courseId,
  onOpenProfile,
  onChanged,
  onCountChange,
  compact = false,
}) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  /** @type {[{ member: object, kind: 'approve'|'reject'|'partial' } | null, Function]} */
  const [actionModal, setActionModal] = useState(null);
  const [reasonText, setReasonText] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError('');
    const res = await staffListCourseGoldenRequests(courseId);
    setLoading(false);
    if (!res.ok) {
      setError(res.error || 'Failed to load Golden requests');
      setRequests([]);
      onCountChange?.(0);
      return;
    }
    const list = res.requests || [];
    setRequests(list);
    onCountChange?.(list.length);
  }, [courseId, onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  const openAction = (member, kind) => {
    setActionMsg('');
    setReasonText('');
    setActionModal({ member, kind });
  };

  const closeAction = () => {
    if (busyId) return;
    setActionModal(null);
    setReasonText('');
    setActionMsg('');
  };

  const confirmAction = async () => {
    if (!actionModal) return;
    const reason = reasonText.trim();
    if (!reason) {
      setActionMsg('A reason is required.');
      return;
    }
    const { member, kind } = actionModal;
    setBusyId(member.id);
    setActionMsg('');
    const res =
      kind === 'partial'
        ? await staffPartialApproveCourseGolden(member.id, reason)
        : await staffReviewCourseGolden(member.id, kind === 'approve', reason);
    setBusyId(null);
    if (!res.ok) {
      setActionMsg(res.error || 'Action failed');
      return;
    }
    setActionModal(null);
    setReasonText('');
    await load();
    onChanged?.();
  };

  const copy = actionModal ? ACTION_COPY[actionModal.kind] : null;

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {!compact ? (
        <div className="flex items-center gap-2">
          <HiSparkles className="h-5 w-5 text-amber-600" aria-hidden />
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Golden access requests</h2>
            <p className="text-xs text-slate-500">
              Approve so the aspirant can choose a pack and pay (payment UI next phase).
            </p>
          </div>
        </div>
      ) : null}

      {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error && requests.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          No pending Golden requests.
        </p>
      ) : null}

      {requests.length > 0 ? (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {requests.map((r) => {
            const hasPartial = Boolean(r.golden_partial_approved_at);
            return (
              <li key={r.id} className="flex flex-col gap-3 px-4 py-3">
                <div className="flex flex-col gap-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onOpenProfile?.(r.aspirant_id)}
                      className="text-left text-sm font-semibold text-slate-900 hover:text-indigo-700 hover:underline"
                    >
                      {r.aspirant_name || 'Aspirant'}
                    </button>
                    <p className="truncate text-xs text-slate-500">{r.aspirant_email}</p>
                    {r.golden_request_reason ? (
                      <p className="mt-1 text-sm text-slate-600">{r.golden_request_reason}</p>
                    ) : (
                      <p className="mt-1 text-xs italic text-slate-400">No reason given</p>
                    )}
                  </div>
                  <div className="flex w-full flex-col gap-2">
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => openAction(r, 'partial')}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                    >
                      <HiClipboardDocumentCheck className="h-4 w-4" aria-hidden />
                      Partial approve
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => openAction(r, 'approve')}
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => openAction(r, 'reject')}
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>

                {hasPartial ? (
                  <div className="flex items-start gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2.5">
                    <HiClipboardDocumentCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
                    <div className="min-w-0 text-xs text-indigo-900">
                      <p className="font-semibold">
                        Partially approved by {r.golden_partial_approved_by_name || 'staff'}
                        {r.golden_partial_approved_by_role ? ` (${r.golden_partial_approved_by_role})` : ''}
                        {' · '}
                        {formatCourseDate(r.golden_partial_approved_at)}
                      </p>
                      {r.golden_partial_reason ? (
                        <p className="mt-0.5 text-indigo-800/90">{r.golden_partial_reason}</p>
                      ) : null}
                      <p className="mt-0.5 italic text-indigo-700/70">
                        Internal note only — final approve/reject is still required.
                      </p>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <StaffFormModal open={Boolean(actionModal)} onClose={closeAction} title={copy?.title} wide>
        {actionModal ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {actionModal.member.aspirant_name || 'This aspirant'} · {actionModal.member.aspirant_email}
            </p>
            <label className="block text-sm">
              <span className="font-semibold text-slate-700">Reason</span>
              <textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value.slice(0, 500))}
                rows={4}
                autoFocus
                placeholder={copy?.placeholder}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              <p className="mt-1 text-right text-xs tabular-nums text-slate-400">{reasonText.length}/500</p>
            </label>
            {actionMsg ? <p className="text-sm text-red-600">{actionMsg}</p> : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={busyId === actionModal.member.id}
                onClick={confirmAction}
                className={`inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-60 ${copy?.button}`}
              >
                {actionModal.kind === 'approve' ? <HiCheckCircle className="h-4 w-4" aria-hidden /> : null}
                {actionModal.kind === 'reject' ? <HiXCircle className="h-4 w-4" aria-hidden /> : null}
                {busyId === actionModal.member.id ? 'Saving…' : copy?.cta}
              </button>
              <button
                type="button"
                disabled={busyId === actionModal.member.id}
                onClick={closeAction}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </StaffFormModal>
    </div>
  );
}
