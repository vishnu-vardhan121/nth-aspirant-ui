import { AI_PRACTICE_LEVELS } from '../../lib/tracks';
import { getSessionTiming } from '../../lib/sessionTiming';

export default function LevelProgressRow({
  levelRow,
  starting,
  onStart,
  subscriptionActive,
}) {
  const level = Number(levelRow?.level);
  const meta = AI_PRACTICE_LEVELS.find((l) => l.level === level);
  const timing = getSessionTiming(level);
  const status = levelRow?.status || 'locked';
  const locked = status === 'locked';
  const passed = status === 'passed';
  const canStart = subscriptionActive && !locked && !starting;

  return (
    <div
      className={`rounded-xl border p-4 ${
        locked
          ? 'border-slate-200 bg-slate-50 opacity-80'
          : passed
            ? 'border-emerald-200 bg-emerald-50/40'
            : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Level {level}
          </p>
          <h3 className="text-lg font-semibold text-slate-900">{meta?.label || '—'}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {timing
              ? `${timing.minMinutes}–${timing.maxMinutes} min · ${meta?.label} difficulty questions`
              : 'Voice practice session'}
          </p>
          {passed && levelRow?.best_percent != null ? (
            <p className="mt-1 text-sm font-medium text-emerald-800">
              Best score: {Number(levelRow.best_percent)}% · Attempts: {levelRow.attempts ?? 0}
            </p>
          ) : null}
          {!passed && levelRow?.best_percent != null ? (
            <p className="mt-1 text-sm text-slate-600">
              Best so far: {Number(levelRow.best_percent)}% · Attempts: {levelRow.attempts ?? 0}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              locked
                ? 'bg-slate-200 text-slate-600'
                : passed
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-indigo-50 text-indigo-800'
            }`}
          >
            {locked ? 'Locked' : passed ? 'Passed' : 'Available'}
          </span>
          <button
            type="button"
            disabled={!canStart}
            onClick={() => onStart(level)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {starting ? 'Starting…' : passed ? 'Practice again' : locked ? 'Locked' : 'Start'}
          </button>
        </div>
      </div>
      {locked ? (
        <p className="mt-3 text-xs text-slate-500">
          Clear the previous level with 70%+ to unlock.
        </p>
      ) : null}
    </div>
  );
}
