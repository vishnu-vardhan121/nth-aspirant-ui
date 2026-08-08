import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { HiArrowLeft, HiPlayCircle } from 'react-icons/hi2';
import { PageLoader } from '../../../components/ui/Loader';
import { formatClassDateTimeIst, getMyCourseClassWatch } from '../../../lib/courses';

/**
 * Aspirant watch page: title + covered topics + Drive preview embed.
 * Playback URL only from gated RPC (not from board list).
 */
export default function CourseClassWatchPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [row, setRow] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!classId) return;
      setLoading(true);
      setError('');
      const res = await getMyCourseClassWatch(classId);
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(res.error || 'Could not load recording');
        setRow(null);
        return;
      }
      setRow(res.class || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [classId]);

  if (loading) {
    return <PageLoader size="md" label="Loading recording…" className="py-16" />;
  }

  if (error || !row) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-1 py-8">
        <button
          type="button"
          onClick={() => navigate('/dashboard/courses')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
        >
          <HiArrowLeft className="h-4 w-4" /> Back to classes
        </button>
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {error || 'Recording not available.'}
        </p>
      </div>
    );
  }

  const topics = Array.isArray(row.covered_topics) ? row.covered_topics : [];

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/dashboard/courses"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
        >
          <HiArrowLeft className="h-4 w-4" /> Back to classes
        </Link>
        {row.starts_at ? (
          <p className="text-xs text-slate-500">{formatClassDateTimeIst(row.starts_at)}</p>
        ) : null}
      </div>

      <header className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <HiPlayCircle className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0">
            {row.course_title ? (
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {row.course_title}
              </p>
            ) : null}
            <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              {row.title}
            </h1>
          </div>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-lg">
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          <iframe
            title={`Recording — ${row.title}`}
            src={row.playback_url}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6">
        <h2 className="text-sm font-bold text-slate-900">Covered topics</h2>
        {topics.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Topics will appear when staff posts them.</p>
        ) : (
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
            {topics.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
