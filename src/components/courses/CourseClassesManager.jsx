import { useCallback, useEffect, useState } from 'react';
import {
  formatClassDateTimeIst,
  istLocalInputToIso,
  staffCreateCourseClass,
  staffDeleteCourseClass,
  staffListCourseClasses,
  staffUpdateCourseClass,
  toDatetimeLocalIst,
} from '../../lib/courses';

const FULL_ROOM_HINT = 'If this meeting is full, use the other link.';

const emptyForm = () => ({
  title: '',
  startsLocal: '',
  meetUrl1: '',
  meetUrl2: '',
});

/**
 * Classic create/edit list for live classes on one course.
 * Used by admin course detail + interviewer courses page.
 */
export default function CourseClassesManager({ courseId, courseTitle }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError('');
    const res = await staffListCourseClasses(courseId);
    setLoading(false);
    if (!res.ok) {
      setError(res.error || 'Failed to load classes');
      setClasses([]);
      return;
    }
    setClasses(res.classes || []);
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    setMsg({ type: '', text: '' });
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      title: row.title || '',
      startsLocal: toDatetimeLocalIst(row.starts_at),
      meetUrl1: row.meet_url_1 || '',
      meetUrl2: row.meet_url_2 || '',
    });
    setMsg({ type: '', text: '' });
  };

  const handleSubmit = async (e) => {
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
    if (editingId) {
      res = await staffUpdateCourseClass(editingId, {
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
    setMsg({ type: 'success', text: editingId ? 'Class updated.' : 'Class created.' });
    resetForm();
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this class?')) return;
    const res = await staffDeleteCourseClass(id);
    if (!res.ok) {
      setMsg({ type: 'error', text: res.error || 'Delete failed' });
      return;
    }
    if (editingId === id) resetForm();
    load();
  };

  if (!courseId) {
    return <p className="text-sm text-slate-600">Select a course to manage live classes.</p>;
  }

  const fieldClass =
    'w-full rounded-xl border border-slate-300 px-3.5 py-3 text-base shadow-sm sm:rounded-md sm:py-2 sm:text-sm';

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h3 className="text-base font-semibold text-slate-900">Live classes</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-600 sm:text-sm">
          {courseTitle ? (
            <>
              Schedule for <span className="font-medium text-slate-800">{courseTitle}</span>. Times are in IST.
            </>
          ) : (
            'Schedule class title, IST start time, and join link(s).'
          )}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          One link = Join directly. Two links = students see: “{FULL_ROOM_HINT}”
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-lg"
      >
        <p className="text-sm font-medium text-slate-800">{editingId ? 'Edit class' : 'Add class'}</p>
        {msg.text ? (
          <p className={`text-sm ${msg.type === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>{msg.text}</p>
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
        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 sm:min-h-0 sm:w-auto sm:rounded-md sm:py-2 sm:font-medium"
          >
            {busy ? 'Saving…' : editingId ? 'Update class' : 'Add class'}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:min-h-0 sm:w-auto sm:rounded-md sm:py-2"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white sm:rounded-lg">
        {loading ? (
          <p className="px-4 py-6 text-sm text-slate-500">Loading classes…</p>
        ) : error ? (
          <p className="px-4 py-6 text-sm text-red-600">{error}</p>
        ) : classes.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">No classes yet.</p>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 sm:hidden">
              {classes.map((row) => (
                <li key={row.id} className="space-y-3 p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{row.title}</p>
                    <p className="mt-1 text-[13px] text-slate-600">{formatClassDateTimeIst(row.starts_at)}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.meet_url_2 ? '2 join links' : '1 join link'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(row)}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-sm font-semibold text-indigo-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row.id)}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold text-slate-700">Title</th>
                    <th className="px-4 py-2.5 font-semibold text-slate-700">Starts (IST)</th>
                    <th className="px-4 py-2.5 font-semibold text-slate-700">Links</th>
                    <th className="px-4 py-2.5 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classes.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.title}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatClassDateTimeIst(row.starts_at)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.meet_url_2 ? '2 links' : '1 link'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => startEdit(row)}
                            className="text-xs font-medium text-indigo-600 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row.id)}
                            className="text-xs font-medium text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
