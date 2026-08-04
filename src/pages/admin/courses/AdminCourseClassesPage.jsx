import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HiArrowLeft } from 'react-icons/hi2';
import CourseClassesManager from '../../../components/courses/CourseClassesManager';
import { PageLoader } from '../../../components/ui/Loader';
import { adminGetCourse } from '../../../lib/courses';

/** Dedicated page for everyday live-class link/schedule work. */
export default function AdminCourseClassesPage() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await adminGetCourse(id);
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(res.error || 'Course not found');
        setCourse(null);
        return;
      }
      setCourse(res.course);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <PageLoader size="md" label="Loading…" className="py-10" />;

  if (error || !course) {
    return (
      <div className="space-y-3 max-w-4xl">
        <Link to="/admin/courses" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
          <HiArrowLeft className="h-4 w-4" /> Back to courses
        </Link>
        <p className="text-sm text-red-600">{error || 'Course not found'}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link to="/admin/courses" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
          <HiArrowLeft className="h-4 w-4" /> Back to courses
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Live classes</h1>
        <p className="mt-1 text-sm text-slate-600">
          {course.title}
          <span className="text-slate-400"> · </span>
          <span className="font-mono text-slate-700">{course.code}</span>
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <CourseClassesManager courseId={course.id} courseTitle={course.title} />
      </div>

      <p className="text-sm text-slate-500">
        Invites, join requests, and members:{' '}
        <Link to={`/admin/courses/${course.id}`} className="font-medium text-indigo-600 hover:underline">
          Open full course manage
        </Link>
      </p>
    </div>
  );
}
