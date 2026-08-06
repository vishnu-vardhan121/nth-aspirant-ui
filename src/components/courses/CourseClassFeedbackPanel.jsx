import { useCallback, useEffect, useState } from 'react';
import { adminListCourseClassFeedback, formatClassDateTimeIst } from '../../lib/courses';

/** Ops admin only — class feedback from aspirants. */
export default function CourseClassFeedbackPanel({ courseId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError('');
    const res = await adminListCourseClassFeedback(courseId);
    setLoading(false);
    if (!res.ok) {
      setError(res.error || 'Not allowed or failed to load');
      setRows([]);
      return;
    }
    setRows(res.feedback || []);
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-slate-900">Class feedback</h3>
        <p className="mt-1 text-sm text-slate-600">Visible to ops admins only (not interviewers).</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white sm:rounded-lg">
        {loading ? (
          <p className="px-4 py-6 text-sm text-slate-500">Loading…</p>
        ) : error ? (
          <p className="px-4 py-6 text-sm text-amber-800">{error}</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">No feedback yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((f) => (
              <li key={f.id} className="space-y-1 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{f.full_name || f.email}</p>
                <p className="text-xs text-slate-500">
                  {f.class_title} · {formatClassDateTimeIst(f.starts_at)}
                </p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{f.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
