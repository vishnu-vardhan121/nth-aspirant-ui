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
          <p className="text-sm text-slate-600 mt-1">Create courses, invite emails, and approve free join requests.</p>
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
        <form onSubmit={handleCreate} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Code (internal)</span>
              <input
                required
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="aug-26"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Title (aspirant-facing)</span>
              <input
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="AI/ML Course — Aug 2026"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Free starts</span>
              <input
                type="datetime-local"
                value={form.freeStartsAt}
                onChange={(e) => setForm((f) => ({ ...f, freeStartsAt: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Free ends</span>
              <input
                type="datetime-local"
                value={form.freeEndsAt}
                onChange={(e) => setForm((f) => ({ ...f, freeEndsAt: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
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
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Free window</th>
                <th className="px-4 py-3 font-medium">Invites</th>
                <th className="px-4 py-3 font-medium">Requests</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.title}</td>
                  <td className="px-4 py-3 text-slate-600">{c.code}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {formatCourseDate(c.free_starts_at)} → {formatCourseDate(c.free_ends_at)}
                  </td>
                  <td className="px-4 py-3">{c.invite_count ?? 0}</td>
                  <td className="px-4 py-3">{c.requested_count ?? 0}</td>
                  <td className="px-4 py-3">{c.free_member_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                        c.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/admin/courses/${c.id}`} className="text-indigo-600 font-medium hover:underline">
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
