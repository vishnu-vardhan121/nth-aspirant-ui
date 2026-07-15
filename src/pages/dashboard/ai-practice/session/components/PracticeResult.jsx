import { Link } from 'react-router-dom';
import { AI_PRACTICE_PASS_PERCENT } from '../../lib/rubrics';

export default function PracticeResult({
  trackId,
  trackLabel,
  level,
  levelLabel,
  result,
  onRetry,
}) {
  const passed = Boolean(result?.passed);
  const percent = result?.overall_percent;
  const areas = Array.isArray(result?.areas) ? result.areas : [];
  const unlocked = result?.unlocked_level;
  const trackCompleted = Boolean(result?.track_completed);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div
        className={`rounded-2xl border p-6 ${
          passed ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'
        }`}
      >
        <p className="text-sm font-medium text-slate-600">
          {trackLabel} · Level {level} — {levelLabel}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          {passed ? 'Level cleared' : 'Not cleared yet'}
        </h1>
        <p className="mt-2 text-3xl font-bold text-slate-900">
          {percent == null ? '—' : `${percent}%`}
          <span className="ml-2 text-base font-medium text-slate-600">
            (need {AI_PRACTICE_PASS_PERCENT}%+)
          </span>
        </p>
        {passed && unlocked ? (
          <p className="mt-2 text-sm font-medium text-emerald-800">
            Level {unlocked} unlocked.
          </p>
        ) : null}
        {trackCompleted ? (
          <p className="mt-2 text-sm font-semibold text-emerald-900">
            Track completed — all 3 levels cleared.
          </p>
        ) : null}
        {!passed ? (
          <p className="mt-2 text-sm text-amber-900">
            Retry anytime — unlimited attempts. Aim for stronger coverage across the topics below.
          </p>
        ) : null}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Topic breakdown</h2>
        {areas.length === 0 ? (
          <p className="text-sm text-slate-500">No area scores returned.</p>
        ) : (
          <ul className="space-y-3">
            {areas.map((area) => {
              const score = Number(area.score) || 0;
              const pct = (score / 2) * 100;
              return (
                <li key={area.name}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-slate-800">{area.name}</span>
                    <span className="text-slate-600">{score}/2</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        score >= 2 ? 'bg-emerald-500' : score === 1 ? 'bg-amber-400' : 'bg-slate-300'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {area.note ? (
                    <p className="mt-1 text-xs text-slate-500">{area.note}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Practice again
        </button>
        {passed && unlocked ? (
          <Link
            to={`/dashboard/ai-practice/${trackId}`}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-800 hover:bg-indigo-100"
          >
            Go to Level {unlocked}
          </Link>
        ) : null}
        <Link
          to={`/dashboard/ai-practice/${trackId}`}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          Back to track
        </Link>
        <Link
          to="/dashboard/ai-practice"
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          All tracks
        </Link>
      </div>
    </div>
  );
}
