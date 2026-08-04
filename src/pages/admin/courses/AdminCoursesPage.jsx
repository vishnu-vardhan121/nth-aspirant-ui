import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageLoader } from '../../../components/ui/Loader';
import { adminCreateCourse, adminListCourses, formatCourseDate } from '../../../lib/courses';

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: '',
    title: '',
    freeStartsAt: '',
    freeEndsAt: '',
    isActive: true,
  });
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    const res = await adminListCourses();
    setLoading(false);
    if (!res.ok) {
      setError(res.error || 'Failed to load courses');
      setCourses([]);
      return;
    }
    setCourses(res.courses || []);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormMsg({ type: '', text: '' });
    setSubmitting(true);
    const res = await adminCreateCourse({
      code: form.code,
      title: form.title,
      freeStartsAt: form.freeStartsAt ? new Date(form.freeStartsAt).toISOString() : null,
      freeEndsAt: form.freeEndsAt ? new Date(form.freeEndsAt).toISOString() : null,
      isActive: form.isActive,
    });
    setSubmitting(false);
    if (!res.ok) {
      setFormMsg({ type: 'error', text: res.error || 'Create failed' });
      return;
    }
    setFormMsg({ type: 'success', text: 'Course created.' });
    setForm({ code: '', title: '', freeStartsAt: '', freeEndsAt: '', isActive: true });
    setCreating(false);
    load();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI/ML courses</h1>
          <p className="text-sm text-slate-600 mt-1">
            Create courses, manage invites, and open Live classes for daily join links.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          {creating ? 'Cancel' : 'Create course'}
        </button>
      </div>

      {creating ? (
        <form onSubmit={handleCreate} className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Code (internal)</span>
              <input
                required
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="aug-26"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Title (aspirant-facing)</span>
              <input
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="AI/ML Course — Aug 2026"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Free starts</span>
              <input
                type="datetime-local"
                value={form.freeStartsAt}
                onChange={(e) => setForm((f) => ({ ...f, freeStartsAt: e.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Free ends</span>
              <input
                type="datetime-local"
                value={form.freeEndsAt}
                onChange={(e) => setForm((f) => ({ ...f, freeEndsAt: e.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Active (open for join)
          </label>
          {formMsg.text ? (
            <p className={`text-sm ${formMsg.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{formMsg.text}</p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Save course'}
          </button>
        </form>
      ) : null}

      {loading ? (
        <PageLoader size="md" label="Loading…" className="py-10" />
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : courses.length === 0 ? (
        <p className="text-sm text-slate-600">No courses yet. Create one to get started.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {courses.map((c) => (
            <li key={c.id} className="flex flex-col rounded-lg border border-slate-200 bg-white">
              <div className="flex-1 space-y-3 border-b border-slate-100 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-slate-900">{c.title}</h2>
                    <p className="mt-0.5 font-mono text-sm text-slate-500">{c.code}</p>
                  </div>
                  <span
                    className={`shrink-0 inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      c.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="text-sm text-slate-600">
                  {formatCourseDate(c.free_starts_at)} → {formatCourseDate(c.free_ends_at)}
                </p>

                <dl className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded border border-slate-100 bg-slate-50 px-2 py-2">
                    <dt className="text-xs text-slate-500">Invites</dt>
                    <dd className="mt-0.5 font-semibold text-slate-900">{c.invite_count ?? 0}</dd>
                  </div>
                  <div className="rounded border border-slate-100 bg-slate-50 px-2 py-2">
                    <dt className="text-xs text-slate-500">Requests</dt>
                    <dd className="mt-0.5 font-semibold text-slate-900">{c.requested_count ?? 0}</dd>
                  </div>
                  <div className="rounded border border-slate-100 bg-slate-50 px-2 py-2">
                    <dt className="text-xs text-slate-500">Joined</dt>
                    <dd className="mt-0.5 font-semibold text-slate-900">{c.free_member_count ?? 0}</dd>
                  </div>
                </dl>
              </div>

              <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:p-4">
                <Link
                  to={`/admin/courses/${c.id}/classes`}
                  className="inline-flex flex-1 items-center justify-center rounded-md bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Live classes
                </Link>
                <Link
                  to={`/admin/courses/${c.id}`}
                  className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  Manage course
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
