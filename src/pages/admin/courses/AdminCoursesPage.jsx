import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiAcademicCap,
  HiCalendarDays,
  HiCheckCircle,
  HiClipboardDocumentList,
  HiEnvelope,
  HiPlus,
  HiUserGroup,
  HiVideoCamera,
  HiXMark,
} from 'react-icons/hi2';
import { PageLoader } from '../../../components/ui/Loader';
import { adminCreateCourse, adminListCourses, formatCourseDate } from '../../../lib/courses';

function StatTile({ icon: Icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-500',
    indigo: 'text-indigo-600',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
  };
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-slate-100 bg-slate-50/80 px-2 py-2.5">
      <Icon className={`h-4 w-4 ${tones[tone] || tones.slate}`} aria-hidden />
      <dd className="text-base font-bold tabular-nums text-slate-900">{value}</dd>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
    </div>
  );
}

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
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
            <HiAcademicCap className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI/ML courses</h1>
              {!loading ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                  {courses.length}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Create courses, manage invites, and open Live classes for daily join links.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors ${
            creating
              ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {creating ? (
            <>
              <HiXMark className="h-4 w-4" aria-hidden />
              Cancel
            </>
          ) : (
            <>
              <HiPlus className="h-4 w-4" aria-hidden />
              Create course
            </>
          )}
        </button>
      </div>

      {creating ? (
        <form
          onSubmit={handleCreate}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <HiPlus className="h-4.5 w-4.5" aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">New course</h2>
              <p className="text-xs text-slate-500">Internal code, aspirant-facing title, and free-batch window.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-semibold text-slate-700">Code (internal)</span>
              <input
                required
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="aug-26"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm shadow-sm outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-slate-700">Title (aspirant-facing)</span>
              <input
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="AI/ML Course — Aug 2026"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm shadow-sm outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-slate-700">Free starts</span>
              <input
                type="datetime-local"
                value={form.freeStartsAt}
                onChange={(e) => setForm((f) => ({ ...f, freeStartsAt: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm shadow-sm outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-slate-700">Free ends</span>
              <input
                type="datetime-local"
                value={form.freeEndsAt}
                onChange={(e) => setForm((f) => ({ ...f, freeEndsAt: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm shadow-sm outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-medium text-slate-700">Active (open for join)</span>
          </label>

          {formMsg.text ? (
            <p
              className={`rounded-lg px-3 py-2 text-sm ${
                formMsg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'
              }`}
            >
              {formMsg.text}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Save course'}
          </button>
        </form>
      ) : null}

      {loading ? (
        <PageLoader size="md" label="Loading…" className="py-10" />
      ) : error ? (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <HiAcademicCap className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-800">No courses yet</p>
          <p className="mt-1 text-sm text-slate-500">Create one to get started.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {courses.map((c) => (
            <li
              key={c.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
            >
              <div className="flex-1 space-y-4 border-b border-slate-100 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                      <HiAcademicCap className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-bold text-slate-900">{c.title}</h2>
                      <p className="mt-0.5 truncate font-mono text-xs text-slate-500">{c.code}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${c.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}
                      aria-hidden
                    />
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="flex items-center gap-1.5 text-sm text-slate-600">
                  <HiCalendarDays className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  {formatCourseDate(c.free_starts_at)} → {formatCourseDate(c.free_ends_at)}
                </p>

                <dl className="grid grid-cols-3 gap-2">
                  <StatTile icon={HiEnvelope} label="Invites" value={c.invite_count ?? 0} tone="indigo" />
                  <StatTile
                    icon={HiClipboardDocumentList}
                    label="Requests"
                    value={c.requested_count ?? 0}
                    tone="amber"
                  />
                  <StatTile icon={HiUserGroup} label="Joined" value={c.free_member_count ?? 0} tone="emerald" />
                </dl>
              </div>

              <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                <Link
                  to={`/admin/courses/${c.id}/classes`}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  <HiVideoCamera className="h-4 w-4" aria-hidden />
                  Live classes
                </Link>
                <Link
                  to={`/admin/courses/${c.id}`}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50"
                >
                  <HiCheckCircle className="h-4 w-4" aria-hidden />
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
