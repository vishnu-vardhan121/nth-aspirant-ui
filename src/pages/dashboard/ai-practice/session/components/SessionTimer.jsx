import { formatDurationMs } from '../../lib/sessionTiming';

/**
 * Shows elapsed / max time. Disables End until minMs; signals auto-end at maxMs.
 */
export default function SessionTimer({
  elapsedMs = 0,
  minMs = 0,
  maxMs = 0,
  canEnd = false,
  connectionStatus = 'disconnected',
}) {
  const remainingToMin = Math.max(0, minMs - elapsedMs);
  const overMax = maxMs > 0 && elapsedMs >= maxMs;

  const statusClass =
    connectionStatus === 'connected'
      ? 'bg-emerald-50 text-emerald-800'
      : connectionStatus === 'reconnecting'
        ? 'bg-amber-50 text-amber-800'
        : connectionStatus === 'connecting'
          ? 'bg-sky-50 text-sky-800'
          : 'bg-slate-100 text-slate-600';

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span className="font-mono text-slate-900">
        {formatDurationMs(elapsedMs)}
        {maxMs > 0 ? (
          <span className="text-slate-500"> / {formatDurationMs(maxMs)}</span>
        ) : null}
      </span>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusClass}`}>
        {connectionStatus}
      </span>
      {!canEnd && remainingToMin > 0 ? (
        <span className="text-xs text-slate-500">
          End available in {formatDurationMs(remainingToMin)}
        </span>
      ) : null}
      {overMax ? (
        <span className="text-xs font-medium text-amber-700">Max time reached — wrapping up…</span>
      ) : null}
    </div>
  );
}
