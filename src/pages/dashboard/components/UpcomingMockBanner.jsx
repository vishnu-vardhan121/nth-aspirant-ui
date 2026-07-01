import { Link } from 'react-router-dom';
import { HiCalendarDays, HiClock, HiLink } from 'react-icons/hi2';
import { normalizeHttpUrl } from '../../../lib/aspirantProfile';
import {
  formatMockScheduleTime,
  isMockScheduleUrgent,
  useUpcomingScheduledMocks,
} from '../hooks/useUpcomingScheduledMocks';

/** Prominent reminder when the aspirant has a scheduled mock — shown on every dashboard page. */
export default function UpcomingMockBanner({ userId }) {
  const { mocks, loading, nextMock } = useUpcomingScheduledMocks(userId);

  if (loading || !nextMock) return null;

  const urgent = isMockScheduleUrgent(nextMock.scheduled_at);
  const joinHref = normalizeHttpUrl(nextMock.meet_link);
  const when = formatMockScheduleTime(nextMock.scheduled_at);
  const extraCount = mocks.length > 1 ? mocks.length - 1 : 0;

  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3.5 text-sm shadow-sm ${
        urgent
          ? 'border-indigo-300 bg-indigo-50 text-indigo-950 ring-1 ring-indigo-200/80'
          : 'border-sky-200 bg-sky-50 text-sky-950'
      }`}
      role="status"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            <HiCalendarDays className={`h-5 w-5 shrink-0 ${urgent ? 'text-indigo-600' : 'text-sky-600'}`} aria-hidden />
            {urgent ? 'Your mock is coming up — be ready!' : 'You have a mock scheduled'}
            {extraCount > 0 ? (
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                +{extraCount} more
              </span>
            ) : null}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 leading-relaxed">
            <HiClock className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
            <span className="font-semibold tabular-nums">{when}</span>
          </p>
          <p className={`mt-1 text-xs ${urgent ? 'text-indigo-900/85' : 'text-sky-900/80'}`}>
            Join on time at the Meet link. Check Messages if the slot was rescheduled.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {joinHref ? (
            <a
              href={joinHref}
              target="_blank"
              rel="noopener noreferrer"
              className="nth-btn-primary inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold"
            >
              <HiLink className="h-4 w-4" aria-hidden />
              Join Meet
            </a>
          ) : null}
          <Link
            to="/dashboard/mocks"
            className="inline-flex items-center rounded-xl border border-indigo-300 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-800 hover:bg-indigo-50"
          >
            Mock details
          </Link>
        </div>
      </div>
    </div>
  );
}
