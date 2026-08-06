import { useCallback, useEffect, useState } from 'react';
import {
  formatClassDateTimeIst,
  istLocalInputToIso,
  staffCreateCourseDoubtSession,
  staffListCourseClasses,
  staffListCourseDoubtRequests,
  staffListCourseDoubtSessions,
} from '../../lib/courses';

const fieldClass =
  'w-full rounded-xl border border-slate-300 px-3.5 py-3 text-base shadow-sm sm:rounded-md sm:py-2 sm:text-sm';

/**
 * Staff: create doubt session linked to a live class; messages pending requesters.
 */
export default function CourseDoubtSessionsManager({ courseId }) {
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [form, setForm] = useState({
    classId: '',
    title: '',
    startsLocal: '',
    meetUrl: '',
  });
  const [pendingCount, setPendingCount] = useState(null);

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
    } else {
      setClasses(clRes.classes || []);
    }
    if (!sessRes.ok) {
      setSessions([]);
    } else {
      setSessions(sessRes.sessions || []);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!form.classId) {
        setPendingCount(null);
        return;
      }
      const res = await staffListCourseDoubtRequests(form.classId);
      if (cancelled) return;
      if (!res.ok) {
        setPendingCount(null);
        return;
      }
      const pending = (res.requests || []).filter((r) => r.status === 'pending').length;
      setPendingCount(pending);
    })();
    return () => {
      cancelled = true;
    };
  }, [form.classId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    const title = form.title.trim();
    const meetUrl = form.meetUrl.trim();
    const startsAt = istLocalInputToIso(form.startsLocal);
    if (!form.classId) {
      setMsg({ type: 'error', text: 'Select the live class this doubt session is for.' });
      return;
    }
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
    const res = await staffCreateCourseDoubtSession({
      classId: form.classId,
      title,
      startsAt,
      meetUrl,
    });
    setBusy(false);
    if (!res.ok) {
      setMsg({ type: 'error', text: res.error || 'Failed to create' });
      return;
    }
    setMsg({
      type: 'success',
      text: `Doubt session created. Messaged ${res.notified_count ?? 0} requester(s).`,
    });
    setForm({ classId: form.classId, title: '', startsLocal: '', meetUrl: '' });
    load();
  };

  if (!courseId) return null;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h3 className="text-base font-semibold text-slate-900">Doubt sessions</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-600 sm:text-sm">
          Separate from live classes. Pick the live class, set title/time/Zoom — pending topic
          requests for that class get a message with the join link.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-lg"
      >
        {msg.text ? (
          <p className={`text-sm ${msg.type === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>
            {msg.text}
          </p>
        ) : null}
        <div>
          <label className="mb-1 block text-sm text-slate-700">Linked live class</label>
          <select
            value={form.classId}
            onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
            className={fieldClass}
            required
          >
            <option value="">Select class…</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} — {formatClassDateTimeIst(c.starts_at)}
              </option>
            ))}
          </select>
          {pendingCount != null ? (
            <p className="mt-1 text-xs text-slate-500">{pendingCount} pending doubt request(s)</p>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-700">Session title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className={fieldClass}
            placeholder="e.g. Doubt clearing — Day 1"
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
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 sm:w-auto sm:min-h-0 sm:rounded-md sm:py-2"
        >
          {busy ? 'Creating…' : 'Create doubt session & notify'}
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white sm:rounded-lg">
        {loading ? (
          <p className="px-4 py-6 text-sm text-slate-500">Loading…</p>
        ) : error ? (
          <p className="px-4 py-6 text-sm text-red-600">{error}</p>
        ) : sessions.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">No doubt sessions yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sessions.map((s) => (
              <li key={s.id} className="space-y-1 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{s.title}</p>
                <p className="text-xs text-slate-500">For live class: {s.class_title}</p>
                <p className="text-[13px] text-slate-600">{formatClassDateTimeIst(s.starts_at)}</p>
                <p className="text-xs text-slate-500">
                  {s.request_count || 0} notified ·{' '}
                  <a href={s.meet_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                    Open Zoom
                  </a>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
