import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HiCalendarDays,
  HiChatBubbleLeftRight,
  HiClipboardDocumentCheck,
  HiPencilSquare,
  HiPlus,
  HiTrash,
  HiUserGroup,
  HiVideoCamera,
} from 'react-icons/hi2';
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
  CourseClassRecordingModal,
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
  'w-full rounded-xl border border-slate-300 px-3.5 py-3 text-base shadow-sm sm:py-2.5 sm:text-sm';

/**
 * Live classes for admin + interviewer — cards with grouped actions.
 */
export default function CourseClassesManager({ courseId, courseTitle }) {
  const adminRole = useAppSelector((state) => state.admin.profile?.role);
  const showFeedbackButton = OPS_ADMIN_ROLES.has(String(adminRole || ''));

  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [pendingByClass, setPendingByClass] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [classModal, setClassModal] = useState(null);
  const [topicsClass, setTopicsClass] = useState(null);
  const [attendanceClass, setAttendanceClass] = useState(null);
  const [recordingClass, setRecordingClass] = useState(null);
  const [requestsClass, setRequestsClass] = useState(null);
  const [feedbackClass, setFeedbackClass] = useState(null);
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

  const stats = useMemo(() => {
    const withTopics = classes.filter(
      (c) => c.topics_saved_at || (c.covered_topics || []).length >= 3
    ).length;
    const pendingTotal = Object.values(pendingByClass).reduce((a, n) => a + (n || 0), 0);
    return {
      classes: classes.length,
      withTopics,
      pendingTotal,
      doubts: sessions.length,
    };
  }, [classes, pendingByClass, sessions.length]);

  if (!courseId) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
        Select a course to manage live classes.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600">
            Class manager
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">Live classes</h2>
          <p className="mt-1 text-sm text-slate-600">
            {courseTitle ? (
              <>
                <span className="font-medium text-slate-800">{courseTitle}</span>
                <span className="text-slate-400"> · </span>
                Times in IST
              </>
            ) : (
              'Schedule classes, post topics, attendance, and doubt sessions.'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setClassModal({ mode: 'create' })}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          <HiPlus className="h-5 w-5" aria-hidden />
          Create class
        </button>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <StatCard label="Classes" value={stats.classes} />
        <StatCard label="Topics posted" value={stats.withTopics} />
        <StatCard label="Pending doubts" value={stats.pendingTotal} tone="amber" />
        <StatCard label="Doubt sessions" value={stats.doubts} tone="indigo" />
      </div>

      <section className="space-y-3">
        <SectionLabel icon={HiVideoCamera}>Classes</SectionLabel>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            Loading classes…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
            {error}
          </div>
        ) : classes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center">
            <p className="text-sm font-semibold text-slate-800">No classes yet</p>
            <p className="mt-1 text-sm text-slate-500">Create a class to add join links and topics.</p>
            <button
              type="button"
              onClick={() => setClassModal({ mode: 'create' })}
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <HiPlus className="h-4 w-4" /> Create first class
            </button>
          </div>
        ) : (
          <ul className="space-y-4">
            {classes.map((row) => {
              const pending = pendingByClass[row.id] || 0;
              const linkedSessions = sessions.filter((s) => s.class_id === row.id);
              const hasTopics =
                Boolean(row.topics_saved_at) || (row.covered_topics || []).length >= 3;
              const hasRecording = Boolean(String(row.recording_url || '').trim());
              const hasDoubt = linkedSessions.length > 0;

              return (
                <li
                  key={row.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3.5 sm:px-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-base font-bold text-slate-900">{row.title}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                          <HiCalendarDays className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                          {formatClassDateTimeIst(row.starts_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Pill>{row.meet_url_2 ? '2 join links' : '1 join link'}</Pill>
                        <Pill tone={hasTopics ? 'emerald' : 'slate'}>
                          {hasTopics ? 'Topics ready' : 'Topics pending'}
                        </Pill>
                        {hasRecording ? <Pill tone="indigo">Recording</Pill> : null}
                        {pending > 0 ? (
                          <Pill tone="amber">
                            {pending} request{pending === 1 ? '' : 's'}
                          </Pill>
                        ) : null}
                        {hasDoubt ? <Pill tone="indigo">Doubt scheduled</Pill> : null}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 px-4 py-4 sm:px-5">
                    <ActionGroup label="Class setup">
                      <ActionBtn
                        icon={HiPencilSquare}
                        onClick={() => setClassModal({ mode: 'edit', row })}
                      >
                        Edit class
                      </ActionBtn>
                    </ActionGroup>

                    <ActionGroup label="After class">
                      <ActionBtn
                        icon={HiClipboardDocumentCheck}
                        onClick={() => setTopicsClass({ id: row.id, title: row.title })}
                      >
                        Topics
                      </ActionBtn>
                      <ActionBtn
                        icon={HiVideoCamera}
                        onClick={() => setRecordingClass({ id: row.id, title: row.title })}
                      >
                        Recording
                      </ActionBtn>
                      <ActionBtn
                        icon={HiUserGroup}
                        onClick={() => setAttendanceClass({ id: row.id, title: row.title })}
                      >
                        Attendance
                      </ActionBtn>
                      {showFeedbackButton ? (
                        <ActionBtn
                          icon={HiChatBubbleLeftRight}
                          onClick={() => setFeedbackClass(row)}
                        >
                          Feedback
                        </ActionBtn>
                      ) : null}
                    </ActionGroup>

                    <ActionGroup label="Doubt session">
                      <ActionBtn
                        icon={HiChatBubbleLeftRight}
                        onClick={() => setRequestsClass(row)}
                      >
                        Requests{pending ? ` (${pending})` : ''}
                      </ActionBtn>
                      {hasDoubt ? (
                        <button
                          type="button"
                          onClick={() =>
                            setDoubtModal({ classRow: row, session: linkedSessions[0] })
                          }
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 text-sm font-semibold text-indigo-900 hover:bg-indigo-100"
                        >
                          Doubt scheduled
                          <span className="text-indigo-600 underline-offset-2 hover:underline">
                            Edit
                          </span>
                        </button>
                      ) : (
                        <ActionBtn
                          primary
                          onClick={() => setDoubtModal({ classRow: row, session: null })}
                        >
                          Schedule doubt
                        </ActionBtn>
                      )}
                    </ActionGroup>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <SectionLabel icon={HiChatBubbleLeftRight}>Scheduled doubt sessions</SectionLabel>
        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
            No doubt sessions yet. Use <span className="font-medium text-slate-700">Schedule doubt</span>{' '}
            on a class after students request topics.
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-sm font-bold text-slate-900">{s.title}</p>
                <p className="mt-1 text-xs text-slate-500">Linked class: {s.class_title}</p>
                <p className="mt-2 text-sm text-slate-600">{formatClassDateTimeIst(s.starts_at)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>{s.request_count || 0} notified</span>
                  <a
                    href={s.meet_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-indigo-600 hover:underline"
                  >
                    Open Zoom
                  </a>
                  <button
                    type="button"
                    className="font-semibold text-indigo-600 hover:underline"
                    onClick={() => {
                      const classRow = classes.find((c) => c.id === s.class_id);
                      if (classRow) setDoubtModal({ classRow, session: s });
                    }}
                  >
                    Edit
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ClassFormModal
        open={Boolean(classModal)}
        courseId={courseId}
        mode={classModal?.mode || 'create'}
        row={classModal?.row || null}
        canDelete={
          classModal?.mode === 'edit' &&
          classModal?.row?.id &&
          !(sessions || []).some((s) => s.class_id === classModal.row.id)
        }
        onClose={() => setClassModal(null)}
        onSaved={() => {
          setClassModal(null);
          load();
        }}
        onDeleted={() => {
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

      {recordingClass ? (
        <CourseClassRecordingModal
          open
          classId={recordingClass.id}
          classTitle={recordingClass.title}
          onClose={() => setRecordingClass(null)}
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

function StatCard({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-white border-slate-200',
    amber: 'bg-amber-50/80 border-amber-100',
    indigo: 'bg-indigo-50/80 border-indigo-100',
  };
  return (
    <div className={`rounded-2xl border px-3 py-3 shadow-sm sm:px-4 ${tones[tone] || tones.slate}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function SectionLabel({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-indigo-600" aria-hidden />
      <h3 className="text-sm font-bold text-slate-900 sm:text-base">{children}</h3>
    </div>
  );
}

function Pill({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    emerald: 'bg-emerald-50 text-emerald-800',
    amber: 'bg-amber-50 text-amber-900',
    indigo: 'bg-indigo-50 text-indigo-800',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
        tones[tone] || tones.slate
      }`}
    >
      {children}
    </span>
  );
}

function ActionGroup({ label, children }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ActionBtn({ children, onClick, primary, danger, icon: Icon }) {
  const cls = primary
    ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm hover:bg-indigo-700'
    : danger
      ? 'border-red-300 bg-red-50 text-red-700 shadow-sm hover:bg-red-100'
      : 'border-slate-300 bg-white text-slate-800 shadow-sm hover:border-slate-400 hover:bg-slate-50';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-sm font-semibold transition ${cls}`}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden /> : null}
      {children}
    </button>
  );
}

function ClassFormModal({ open, courseId, mode, row, canDelete, onClose, onSaved, onDeleted }) {
  const draftKey =
    mode === 'edit' && row?.id ? `class-edit:${row.id}` : `class-create:${courseId || 'none'}`;
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  const deleteClass = async () => {
    if (!row?.id) return;
    if (!window.confirm('Delete this class?')) return;
    setDeleting(true);
    setMsg({ type: '', text: '' });
    const res = await staffDeleteCourseClass(row.id);
    setDeleting(false);
    if (!res.ok) {
      setMsg({ type: 'error', text: res.error || 'Delete failed' });
      return;
    }
    clearDraft(draftKey);
    onDeleted?.();
  };

  return (
    <StaffFormModal
      open={open}
      title={mode === 'edit' ? 'Edit class' : 'Create class'}
      subtitle="Title, IST time, join link(s)"
      onClose={onClose}
      wide
      headerAction={
        mode === 'edit' && canDelete ? (
          <button
            type="button"
            disabled={busy || deleting}
            onClick={deleteClass}
            className="rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-50"
            aria-label="Delete class"
            title="Delete class"
          >
            <HiTrash className="h-3.5 w-3.5" />
          </button>
        ) : null
      }
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
          disabled={busy || deleting}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? 'Saving…' : mode === 'edit' ? 'Update class' : 'Create class'}
        </button>
      </form>
    </StaffFormModal>
  );
}
