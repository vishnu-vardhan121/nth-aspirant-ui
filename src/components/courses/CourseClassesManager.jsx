import { useCallback, useEffect, useState } from 'react';
import {
  formatClassDateTimeIst,
  istLocalInputToIso,
  staffCreateCourseClass,
  staffDeleteCourseClass,
  staffListCourseClasses,
  staffListCourseDoubtRequests,
  staffListCourseDoubtSessions,
  staffUpdateCourseClass,
  toDatetimeLocalIst,
} from '../../lib/courses';
import { clearDraft, loadDraft, saveDraft } from '../../lib/draftStorage';
import { useAppSelector } from '../../store/hooks';
import {
  CourseClassAttendanceModal,
  CourseClassTopicsModal,
} from './CourseClassSessionModal';
import {
  CourseClassFeedbackModal,
  CourseDoubtRequestsModal,
  CourseScheduleDoubtModal,
} from './CourseDoubtModals';
import StaffFormModal from './StaffFormModal';

/** Matches is_ops_admin() — not interviewers. */
const OPS_ADMIN_ROLES = new Set(['super admin', 'admin', 'assistant admin']);

const emptyForm = () => ({
  title: '',
  startsLocal: '',
  meetUrl1: '',
  meetUrl2: '',
});

const fieldClass =
  'w-full rounded-xl border border-slate-300 px-3.5 py-3 text-base shadow-sm sm:rounded-md sm:py-2 sm:text-sm';

/**
 * Live classes list — create/edit + session + doubt requests/schedule via modals.
 */
export default function CourseClassesManager({ courseId, courseTitle }) {
  const adminRole = useAppSelector((state) => state.admin.profile?.role);
  const showFeedbackButton = OPS_ADMIN_ROLES.has(String(adminRole || ''));

  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [pendingByClass, setPendingByClass] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [classModal, setClassModal] = useState(null); // null | { mode: 'create'|'edit', row? }
  const [topicsClass, setTopicsClass] = useState(null);
  const [attendanceClass, setAttendanceClass] = useState(null);
  const [requestsClass, setRequestsClass] = useState(null);
  const [feedbackClass, setFeedbackClass] = useState(null);
  /** { classRow, session? } — session set = edit mode */
  const [doubtModal, setDoubtModal] = useState(null);

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError('');
    const [clRes, sessRes] = await Promise.all([
      staffListCourseClasses(courseId),
      staffListCourseDoubtSessions(courseId),
    ]);
    setLoading(false);
    if (!clRes.ok) {
      setError(clRes.error || 'Failed to load classes');
      setClasses([]);
      return;
    }
    const list = [...(clRes.classes || [])].sort(
      (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
    );
    setClasses(list);
    const sess = [...(sessRes.ok ? sessRes.sessions || [] : [])].sort(
      (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
    );
    setSessions(sess);

    const counts = {};
    await Promise.all(
      list.map(async (row) => {
        const res = await staffListCourseDoubtRequests(row.id);
        if (res.ok) {
          counts[row.id] = (res.requests || []).filter((r) => r.status === 'pending').length;
        }
      })
    );
    setPendingByClass(counts);
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!courseId) {
    return <p className="text-sm text-slate-600">Select a course to manage live classes.</p>;
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900">Live classes</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-600 sm:text-sm">
            {courseTitle ? (
              <>
                Schedule for <span className="font-medium text-slate-800">{courseTitle}</span>. Times
                are in IST.
              </>
            ) : (
              'Create classes, post topics/session details, review doubt requests, schedule doubt Zoom.'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setClassModal({ mode: 'create' })}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Create class
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white sm:rounded-lg">
        {loading ? (
          <p className="px-4 py-6 text-sm text-slate-500">Loading classes…</p>
        ) : error ? (
          <p className="px-4 py-6 text-sm text-red-600">{error}</p>
        ) : classes.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">No classes yet. Use Create class.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {classes.map((row) => {
              const pending = pendingByClass[row.id] || 0;
              const linkedSessions = sessions.filter((s) => s.class_id === row.id);
              return (
                <li key={row.id} className="space-y-3 p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{row.title}</p>
                    <p className="mt-1 text-[13px] text-slate-600">
                      {formatClassDateTimeIst(row.starts_at)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {row.meet_url_2 ? '2 join links' : '1 join link'}
                      </span>
                      {row.topics_saved_at || (row.covered_topics || []).length >= 3 ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                          Topics saved
                        </span>
                      ) : null}
                      {pending > 0 ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                          {pending} pending request{pending === 1 ? '' : 's'}
                        </span>
                      ) : null}
                      {linkedSessions.length > 0 ? (
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-800">
                          {linkedSessions.length} doubt session
                          {linkedSessions.length === 1 ? '' : 's'}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    <ActionBtn onClick={() => setClassModal({ mode: 'edit', row })}>Edit</ActionBtn>
                    <ActionBtn onClick={() => setTopicsClass({ id: row.id, title: row.title })}>
                      Topics
                    </ActionBtn>
                    <ActionBtn onClick={() => setAttendanceClass({ id: row.id, title: row.title })}>
                      Attendance
                    </ActionBtn>
                    <ActionBtn onClick={() => setRequestsClass(row)}>
                      Requests{pending ? ` (${pending})` : ''}
                    </ActionBtn>
                    {showFeedbackButton ? (
                      <ActionBtn onClick={() => setFeedbackClass(row)}>Feedback</ActionBtn>
                    ) : null}
                    {linkedSessions.length > 0 ? (
                      <span className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-sm font-semibold text-indigo-900 sm:col-span-1 sm:justify-start">
                        Doubt scheduled
                        <button
                          type="button"
                          onClick={() =>
                            setDoubtModal({ classRow: row, session: linkedSessions[0] })
                          }
                          className="font-semibold text-indigo-600 underline-offset-2 hover:underline"
                        >
                          Edit
                        </button>
                      </span>
                    ) : (
                      <ActionBtn
                        primary
                        onClick={() => setDoubtModal({ classRow: row, session: null })}
                      >
                        Schedule doubt
                      </ActionBtn>
                    )}
                    {linkedSessions.length === 0 ? (
                      <ActionBtn danger onClick={() => handleDelete(row.id, load)}>
                        Delete
                      </ActionBtn>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {sessions.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:rounded-lg">
          <p className="text-sm font-semibold text-slate-900">Scheduled doubt sessions</p>
          <ul className="mt-2 divide-y divide-slate-200">
            {sessions.map((s) => (
              <li key={s.id} className="py-2.5">
                <p className="text-sm font-medium text-slate-900">{s.title}</p>
                <p className="text-xs text-slate-500">For: {s.class_title}</p>
                <p className="text-[13px] text-slate-600">{formatClassDateTimeIst(s.starts_at)}</p>
                <p className="text-xs text-slate-500">
                  {s.request_count || 0} notified ·{' '}
                  <a
                    href={s.meet_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    Open Zoom
                  </a>
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ClassFormModal
        open={Boolean(classModal)}
        courseId={courseId}
        mode={classModal?.mode || 'create'}
        row={classModal?.row || null}
        onClose={() => setClassModal(null)}
        onSaved={() => {
          setClassModal(null);
          load();
        }}
      />

      {topicsClass ? (
        <CourseClassTopicsModal
          open
          classId={topicsClass.id}
          classTitle={topicsClass.title}
          onClose={() => setTopicsClass(null)}
          onSaved={() => load()}
        />
      ) : null}

      {attendanceClass ? (
        <CourseClassAttendanceModal
          open
          courseId={courseId}
          classId={attendanceClass.id}
          classTitle={attendanceClass.title}
          onClose={() => setAttendanceClass(null)}
          onSaved={() => load()}
        />
      ) : null}

      <CourseDoubtRequestsModal
        open={Boolean(requestsClass)}
        classRow={requestsClass}
        onClose={() => setRequestsClass(null)}
      />

      <CourseClassFeedbackModal
        open={Boolean(feedbackClass)}
        classRow={feedbackClass}
        onClose={() => setFeedbackClass(null)}
      />

      <CourseScheduleDoubtModal
        open={Boolean(doubtModal)}
        courseId={courseId}
        classRow={doubtModal?.classRow || null}
        session={doubtModal?.session || null}
        onClose={() => setDoubtModal(null)}
        onSaved={() => {
          setDoubtModal(null);
          load();
        }}
      />
    </div>
  );
}

async function handleDelete(id, reload) {
  if (!window.confirm('Delete this class?')) return;
  const res = await staffDeleteCourseClass(id);
  if (!res.ok) {
    window.alert(res.error || 'Delete failed');
    return;
  }
  reload();
}

function ActionBtn({ children, onClick, primary, danger }) {
  const cls = primary
    ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm hover:bg-indigo-700'
    : danger
      ? 'border-red-300 bg-red-50 text-red-700 shadow-sm hover:bg-red-100'
      : 'border-slate-300 bg-white text-slate-800 shadow-sm hover:border-slate-400 hover:bg-slate-50';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 w-full items-center justify-center rounded-xl border px-3.5 text-sm font-semibold transition sm:w-auto sm:min-w-[6.5rem] ${cls}`}
    >
      {children}
    </button>
  );
}

function ClassFormModal({ open, courseId, mode, row, onClose, onSaved }) {
  const draftKey =
    mode === 'edit' && row?.id ? `class-edit:${row.id}` : `class-create:${courseId || 'none'}`;
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!open) {
      setHydrated(false);
      return;
    }
    const draft = loadDraft(draftKey, null);
    if (draft) {
      setForm(draft);
    } else if (mode === 'edit' && row) {
      setForm({
        title: row.title || '',
        startsLocal: toDatetimeLocalIst(row.starts_at),
        meetUrl1: row.meet_url_1 || '',
        meetUrl2: row.meet_url_2 || '',
      });
    } else {
      setForm(emptyForm());
    }
    setMsg({ type: '', text: '' });
    setHydrated(true);
  }, [open, draftKey, mode, row]);

  useEffect(() => {
    if (!open || !hydrated) return;
    saveDraft(draftKey, form);
  }, [form, open, draftKey, hydrated]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    const title = form.title.trim();
    const startsAt = istLocalInputToIso(form.startsLocal);
    const meetUrl1 = form.meetUrl1.trim();
    const meetUrl2 = form.meetUrl2.trim();
    if (!title) {
      setMsg({ type: 'error', text: 'Title is required.' });
      return;
    }
    if (!startsAt) {
      setMsg({ type: 'error', text: 'Start date & time (IST) is required.' });
      return;
    }
    if (!meetUrl1) {
      setMsg({ type: 'error', text: 'At least one join link is required.' });
      return;
    }
    setBusy(true);
    let res;
    if (mode === 'edit' && row?.id) {
      res = await staffUpdateCourseClass(row.id, {
        title,
        startsAt,
        meetUrl1,
        meetUrl2,
        clearMeetUrl2: !meetUrl2,
      });
    } else {
      res = await staffCreateCourseClass({
        courseId,
        title,
        startsAt,
        meetUrl1,
        meetUrl2: meetUrl2 || null,
      });
    }
    setBusy(false);
    if (!res.ok) {
      setMsg({ type: 'error', text: res.error || 'Save failed' });
      return;
    }
    clearDraft(draftKey);
    onSaved?.();
  };

  return (
    <StaffFormModal
      open={open}
      title={mode === 'edit' ? 'Edit class' : 'Create class'}
      subtitle="Title, IST time, join link(s)"
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="space-y-3">
        {msg.text ? (
          <p className={`text-sm ${msg.type === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>
            {msg.text}
          </p>
        ) : null}
        <div>
          <label className="mb-1 block text-sm text-slate-700">Class title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className={fieldClass}
            placeholder="e.g. Day 1 — Intro to Python"
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
          <label className="mb-1 block text-sm text-slate-700">Join link 1</label>
          <input
            type="url"
            value={form.meetUrl1}
            onChange={(e) => setForm((f) => ({ ...f, meetUrl1: e.target.value }))}
            className={fieldClass}
            placeholder="https://…"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-700">Join link 2 (optional)</label>
          <input
            type="url"
            value={form.meetUrl2}
            onChange={(e) => setForm((f) => ({ ...f, meetUrl2: e.target.value }))}
            className={fieldClass}
            placeholder="Second room if the first is full"
          />
        </div>
        <p className="text-xs text-slate-500">
          Draft is kept if you close the modal or switch course — until you save.
        </p>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? 'Saving…' : mode === 'edit' ? 'Update class' : 'Create class'}
        </button>
      </form>
    </StaffFormModal>
  );
}
