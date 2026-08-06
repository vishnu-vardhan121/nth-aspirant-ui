import { useEffect, useState } from 'react';
import {
  formatClassDateTimeIst,
  istLocalInputToIso,
  staffCreateCourseDoubtSession,
  staffListCourseDoubtRequests,
  staffUpdateCourseDoubtSession,
  toDatetimeLocalIst,
  adminListClassFeedback,
} from '../../lib/courses';
import { clearDraft, loadDraft, saveDraft } from '../../lib/draftStorage';
import StaffFormModal from './StaffFormModal';

const fieldClass =
  'w-full rounded-xl border border-slate-300 px-3.5 py-3 text-base shadow-sm sm:rounded-md sm:py-2 sm:text-sm';

/** List doubt requests for one live class. */
export function CourseDoubtRequestsModal({ open, classRow, onClose }) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !classRow?.id) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      const res = await staffListCourseDoubtRequests(classRow.id);
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(res.error || 'Failed to load requests');
        setRequests([]);
        return;
      }
      setRequests(res.requests || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, classRow?.id]);

  const pending = requests.filter((r) => r.status === 'pending');
  const notified = requests.filter((r) => r.status === 'notified');

  return (
    <StaffFormModal
      open={open}
      title="Doubt requests"
      subtitle={classRow?.title || ''}
      onClose={onClose}
      wide
    >
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-slate-600">No doubt requests for this class yet.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Pending {pending.length} · Notified {notified.length}
          </p>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {requests.map((r) => (
              <li key={r.id} className="space-y-1 px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{r.full_name || r.email}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      r.status === 'pending'
                        ? 'bg-amber-50 text-amber-900'
                        : 'bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{r.email}</p>
                <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
                  {(Array.isArray(r.topics) ? r.topics : []).map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </StaffFormModal>
  );
}

/** Ops admin: aspirant class feedback for one live class. */
export function CourseClassFeedbackModal({ open, classRow, onClose }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !classRow?.id) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      const res = await adminListClassFeedback(classRow.id);
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(res.error || 'Not allowed or failed to load');
        setRows([]);
        return;
      }
      setRows(res.feedback || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, classRow?.id]);

  return (
    <StaffFormModal
      open={open}
      title="Class feedback"
      subtitle={classRow?.title || ''}
      onClose={onClose}
      wide
    >
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-amber-800">
          {error === 'Not allowed'
            ? 'Class feedback is visible to ops admins only (not interviewers).'
            : error}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-600">No feedback for this class yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {rows.map((f) => (
            <li key={f.id} className="space-y-1 px-3 py-3">
              <p className="text-sm font-semibold text-slate-900">{f.full_name || f.email}</p>
              <p className="text-xs text-slate-500">{f.email}</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{f.body}</p>
            </li>
          ))}
        </ul>
      )}
    </StaffFormModal>
  );
}

/**
 * Create or edit doubt session for a live class.
 * session prop set = edit mode (no notify on update).
 */
export function CourseScheduleDoubtModal({
  open,
  courseId,
  classRow,
  session = null,
  onClose,
  onSaved,
}) {
  const isEdit = Boolean(session?.id);
  const draftKey = isEdit
    ? `doubt-session-edit:${session.id}`
    : classRow?.id
      ? `doubt-session:${classRow.id}`
      : '';
  const [form, setForm] = useState({ title: '', startsLocal: '', meetUrl: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [pendingCount, setPendingCount] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!open || !classRow?.id) {
      setHydrated(false);
      return;
    }
    const draft = loadDraft(draftKey, null);
    if (draft) {
      setForm(draft);
    } else if (isEdit && session) {
      setForm({
        title: session.title || '',
        startsLocal: toDatetimeLocalIst(session.starts_at),
        meetUrl: session.meet_url || '',
      });
    } else {
      setForm({
        title: `Doubt — ${classRow.title || 'class'}`,
        startsLocal: '',
        meetUrl: '',
      });
    }
    setMsg({ type: '', text: '' });
    setHydrated(true);
  }, [open, classRow?.id, classRow?.title, draftKey, isEdit, session]);

  useEffect(() => {
    if (!open || !draftKey || !hydrated) return;
    saveDraft(draftKey, form);
  }, [form, open, draftKey, hydrated]);

  useEffect(() => {
    if (!open || !classRow?.id || isEdit) return undefined;
    let cancelled = false;
    (async () => {
      const res = await staffListCourseDoubtRequests(classRow.id);
      if (cancelled) return;
      if (!res.ok) {
        setPendingCount(null);
        return;
      }
      setPendingCount((res.requests || []).filter((r) => r.status === 'pending').length);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, classRow?.id, isEdit]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    const title = form.title.trim();
    const meetUrl = form.meetUrl.trim();
    const startsAt = istLocalInputToIso(form.startsLocal);
    if (!title) {
      setMsg({ type: 'error', text: 'Title is required.' });
      return;
    }
    if (!startsAt) {
      setMsg({ type: 'error', text: 'Start date & time (IST) is required.' });
      return;
    }
    if (!meetUrl) {
      setMsg({ type: 'error', text: 'Zoom link is required.' });
      return;
    }
    setBusy(true);
    const res = isEdit
      ? await staffUpdateCourseDoubtSession({
          id: session.id,
          title,
          startsAt,
          meetUrl,
        })
      : await staffCreateCourseDoubtSession({
          classId: classRow.id,
          title,
          startsAt,
          meetUrl,
        });
    setBusy(false);
    if (!res.ok) {
      setMsg({ type: 'error', text: res.error || 'Failed to save' });
      return;
    }
    clearDraft(draftKey);
    setMsg({
      type: 'success',
      text: isEdit
        ? 'Doubt session updated.'
        : `Created. Messaged ${res.notified_count ?? 0} requester(s).`,
    });
    onSaved?.(res);
  };

  return (
    <StaffFormModal
      open={open}
      title={isEdit ? 'Edit doubt session' : 'Schedule doubt session'}
      subtitle={classRow?.title || ''}
      onClose={onClose}
      wide
    >
      <p className="mb-3 text-sm text-slate-600">
        {isEdit
          ? 'Update title, time, or Zoom link. Students already see this session on their class card.'
          : 'Linked to this live class. Pending requesters get an in-app message with the Zoom link.'}
        {!isEdit && pendingCount != null ? (
          <span className="mt-1 block text-xs font-medium text-amber-800">
            {pendingCount} pending request(s) will be notified.
          </span>
        ) : null}
      </p>
      <form onSubmit={submit} className="space-y-3">
        {msg.text ? (
          <p className={`text-sm ${msg.type === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>
            {msg.text}
          </p>
        ) : null}
        <div>
          <label className="mb-1 block text-sm text-slate-700">Session title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className={fieldClass}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-700">Start date &amp; time (IST)</label>
          <input
            type="datetime-local"
            value={form.startsLocal}
            onChange={(e) => setForm((f) => ({ ...f, startsLocal: e.target.value }))}
            className={fieldClass}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-700">Zoom link</label>
          <input
            type="url"
            value={form.meetUrl}
            onChange={(e) => setForm((f) => ({ ...f, meetUrl: e.target.value }))}
            className={fieldClass}
            placeholder="https://…"
            required
          />
        </div>
        <p className="text-xs text-slate-500">
          Draft is kept if you close this modal or switch course — until you save.
        </p>
        <button
          type="submit"
          disabled={busy || !courseId}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create & notify requesters'}
        </button>
      </form>
      {classRow?.starts_at ? (
        <p className="mt-3 text-xs text-slate-500">
          Live class was {formatClassDateTimeIst(classRow.starts_at)}
        </p>
      ) : null}
    </StaffFormModal>
  );
}
