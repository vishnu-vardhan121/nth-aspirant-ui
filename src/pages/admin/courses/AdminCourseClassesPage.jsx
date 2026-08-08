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
      <div className="mx-auto max-w-5xl space-y-3">
        <Link
          to="/admin/courses"
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
        >
          <HiArrowLeft className="h-4 w-4" /> Back to courses
        </Link>
        <p className="text-sm text-red-600">{error || 'Course not found'}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/admin/courses"
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
        >
          <HiArrowLeft className="h-4 w-4" /> Back to courses
        </Link>
        <Link
          to={`/admin/courses/${course.id}`}
          className="text-sm font-medium text-slate-600 hover:text-indigo-600 hover:underline"
        >
          Invites &amp; members →
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 px-3 py-4 sm:px-5 sm:py-6">
        <p className="mb-1 font-mono text-xs text-slate-500">{course.code}</p>
        <CourseClassesManager courseId={course.id} courseTitle={course.title} />
      </div>
    </div>
  );
}
