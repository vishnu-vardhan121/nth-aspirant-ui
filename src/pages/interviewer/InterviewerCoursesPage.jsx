import { useEffect, useState } from 'react';
import { HiAcademicCap } from 'react-icons/hi2';
import CourseClassesManager from '../../components/courses/CourseClassesManager';
import CourseGoldenRequestsPanel from '../../components/courses/CourseGoldenRequestsPanel';
import { PageLoader } from '../../components/ui/Loader';
import { staffListCoursesForClasses } from '../../lib/courses';

export default function InterviewerCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await staffListCoursesForClasses();
      setLoading(false);
      if (!res.ok) {
        setError(res.error || 'Failed to load courses');
        setCourses([]);
        return;
      }
      const list = res.courses || [];
      setCourses(list);
      if (list.length && !courseId) setCourseId(list[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once
  }, []);

  const selected = courses.find((c) => c.id === courseId) || null;

  if (loading) return <PageLoader size="md" label="Loading…" className="py-10" />;

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600">
          Interviewer
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Live classes</h1>
        <p className="mt-1 text-sm text-slate-600">
          Pick a course, then manage schedule, Golden requests, topics, attendance, and doubt
          sessions.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-600">
          No courses found.
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <HiAcademicCap className="h-4 w-4 text-indigo-600" aria-hidden />
              Course
            </label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full max-w-lg rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm shadow-sm sm:py-2.5"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                  {c.is_active ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
          </div>

          {courseId ? (
            <div className="rounded-2xl border border-amber-200/80 bg-white p-4 shadow-sm sm:p-5">
              <CourseGoldenRequestsPanel courseId={courseId} key={courseId} />
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 px-3 py-4 sm:px-5 sm:py-6">
            <CourseClassesManager courseId={courseId} courseTitle={selected?.title || ''} />
          </div>
        </>
      )}
    </div>
  );
}
