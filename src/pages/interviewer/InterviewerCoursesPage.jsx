import { useEffect, useState } from 'react';
import CourseClassesManager from '../../components/courses/CourseClassesManager';
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
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Live classes</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create and update class title, IST start time, and join link(s) for any course.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {courses.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
          No courses found.
        </p>
      ) : (
        <>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Course</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                  {c.is_active ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
            <CourseClassesManager courseId={courseId} courseTitle={selected?.title || ''} />
          </div>
        </>
      )}
    </div>
  );
}
