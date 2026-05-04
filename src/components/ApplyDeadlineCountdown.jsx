import { useEffect, useMemo, useState } from 'react';
import { applyDeadlineCloseMs, formatDurationParts } from '../lib/jobApplicationDeadline';

/**
 * Live countdown until apply closes. Uses `application_deadline_at` when set,
 * otherwise end of `application_deadline` calendar day (IST).
 */
export default function ApplyDeadlineCountdown({ applicationDeadlineAt, applicationDeadlineDate, className = '' }) {
  const endMs = useMemo(
    () =>
      applyDeadlineCloseMs({
        application_deadline_at: applicationDeadlineAt,
        application_deadline: applicationDeadlineDate,
      }),
    [applicationDeadlineAt, applicationDeadlineDate],
  );
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    if (!endMs) return undefined;
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [endMs]);

  if (!endMs) return null;
  const left = endMs - tick;
  if (left <= 0) {
    return (
      <span className={`text-xs font-semibold text-slate-500 ${className}`.trim()}>
        Apply window ended
      </span>
    );
  }
  const parts = formatDurationParts(left);
  if (!parts) return null;
  const { days, h, m, s } = parts;
  const segs = [];
  if (days > 0) segs.push(`${days}d`);
  segs.push(`${h}h`, `${String(m).padStart(2, '0')}m`, `${String(s).padStart(2, '0')}s`);
  return (
    <span className={`text-xs font-bold tabular-nums text-amber-900 tracking-tight ${className}`.trim()}>
      {segs.join(' ')}
    </span>
  );
}
