import { useCallback, useEffect, useState } from 'react';
import { HiSparkles } from 'react-icons/hi2';
import {
  staffListCourseGoldenRequests,
  staffReviewCourseGolden,
} from '../../lib/courses';

/**
 * Admin / interviewer: pending Golden access requests for a course.
 */
export default function CourseGoldenRequestsPanel({
  courseId,
  onOpenProfile,
  onChanged,
  compact = false,
}) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError('');
    const res = await staffListCourseGoldenRequests(courseId);
    setLoading(false);
    if (!res.ok) {
      setError(res.error || 'Failed to load Golden requests');
      setRequests([]);
      return;
    }
    setRequests(res.requests || []);
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (memberId, approve) => {
    setBusyId(memberId);
    const res = await staffReviewCourseGolden(memberId, approve);
    setBusyId(null);
    if (!res.ok) {
      window.alert(res.error || 'Review failed');
      return;
    }
    await load();
    onChanged?.();
  };

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
          {requests.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
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
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:shrink-0">
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => review(r.id, true)}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 sm:w-auto"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => review(r.id, false)}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 sm:w-auto"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
