import { useEffect, useState } from 'react';
import { HiCalendarDays, HiVideoCamera } from 'react-icons/hi2';
import { formatClassDateTimeIst, listMyUpcomingCourseClasses } from '../../lib/courses';

const FULL_ROOM_HINT = 'If this meeting is full, use the other link.';

const joinBtnPrimary =
  'inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 active:bg-indigo-800 sm:w-auto sm:min-w-[9.5rem]';
const joinBtnSecondary =
  'inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 active:bg-slate-100 sm:w-auto sm:min-w-[9.5rem]';

function EmptyClassesState({ startHint }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-7 text-center sm:px-6 sm:py-8">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/80">
        <HiVideoCamera className="h-6 w-6" aria-hidden />
      </span>
      <p className="mt-4 text-sm font-bold text-slate-900">No live class scheduled yet</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-slate-600 sm:text-sm">
        {startHint
          ? `Your batch starts ${startHint}. Join links for each day will appear here when admin posts them.`
          : 'When today’s or an upcoming class is posted, the join link will show up here.'}
      </p>
    </div>
  );
}

function SectionHeading() {
  return (
    <div className="flex items-center gap-2">
      <HiCalendarDays className="h-5 w-5 shrink-0 text-indigo-600" aria-hidden />
      <h3 className="text-base font-bold text-slate-900">Live classes</h3>
    </div>
  );
}

/** Classic list of upcoming live classes for enrolled aspirants. */
export default function UpcomingCourseClasses({ courseId = null, startHint = '' }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await listMyUpcomingCourseClasses();
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setClasses([]);
        return;
      }
      const all = res.classes || [];
      setClasses(courseId ? all.filter((c) => c.course_id === courseId) : all);
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <SectionHeading />
        <p className="text-sm text-slate-500">Loading schedule…</p>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="space-y-3">
        <SectionHeading />
        <EmptyClassesState startHint={startHint} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SectionHeading />
      <ul className="space-y-3 sm:space-y-0 sm:divide-y sm:divide-slate-200 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-slate-200 sm:bg-white sm:shadow-sm">
        {classes.map((row) => {
          const hasTwo = Boolean(String(row.meet_url_2 || '').trim());
          return (
            <li
              key={row.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-none sm:border-0 sm:p-5 sm:shadow-none"
            >
              <div className="flex flex-col gap-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 sm:text-[15px]">{row.title}</p>
                  {!courseId && row.course_title ? (
                    <p className="mt-0.5 text-xs text-slate-500">{row.course_title}</p>
                  ) : null}
                  <p className="mt-1 text-[13px] text-slate-600 sm:text-sm">
                    {formatClassDateTimeIst(row.starts_at)}
                  </p>
                  {hasTwo ? (
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">{FULL_ROOM_HINT}</p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                  {hasTwo ? (
                    <>
                      <a
                        href={row.meet_url_1}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={joinBtnPrimary}
                      >
                        <span className="sm:hidden">Join — Link 1</span>
                        <span className="hidden sm:inline">Join live class — Link 1</span>
                      </a>
                      <a
                        href={row.meet_url_2}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={joinBtnSecondary}
                      >
                        <span className="sm:hidden">Join — Link 2</span>
                        <span className="hidden sm:inline">Join live class — Link 2</span>
                      </a>
                    </>
                  ) : (
                    <a
                      href={row.meet_url_1}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={joinBtnPrimary}
                    >
                      Join live class
                    </a>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
