import { Link } from 'react-router-dom';

export default function TrackCard({ track, passedCount = 0, trackCompleted = false }) {
  const total = 3;
  const done = Math.min(total, Number(passedCount) || 0);

  return (
    <Link
      to={`/dashboard/ai-practice/${track.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{track.label}</h3>
        {trackCompleted ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
            Completed
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {done}/{total}
          </span>
        )}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${trackCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`}
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {trackCompleted
          ? 'All 3 levels cleared'
          : done === 0
            ? 'Start with Basic'
            : `${done} of ${total} levels cleared`}
      </p>
    </Link>
  );
}
