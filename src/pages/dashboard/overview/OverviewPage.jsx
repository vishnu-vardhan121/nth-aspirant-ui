import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { PageLoader } from '../../../components/ui/Loader';
import StatCard from '../components/StatCard';
import RecentJobsList from './components/RecentJobsList';
import RecentApplicationsList from './components/RecentApplicationsList';
import { HiBriefcase, HiCheckCircle, HiClipboardDocumentCheck } from 'react-icons/hi2';

function formatPostedAt(createdAt) {
  if (!createdAt) return '—';
  const d = new Date(createdAt);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatAppliedAt(createdAt) {
  if (!createdAt) return '—';
  const d = new Date(createdAt);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function OverviewPage() {
  const [applicationUsage, setApplicationUsage] = useState(null);
  const [mockUsage, setMockUsage] = useState(null);
  const [jobsOpenCount, setJobsOpenCount] = useState(null);
  const [completedMocksCount, setCompletedMocksCount] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [usageRes, mockRes, jobsCountRes, completedMocksRes, jobsRes, appsRes] = await Promise.all([
      supabase.rpc('get_application_usage'),
      supabase.rpc('get_mock_usage'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('mock_registrations').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('jobs').select('id, title, company_name, location, job_type, description, created_at').eq('status', 'open').order('created_at', { ascending: false }).limit(5),
      supabase.from('applications').select('id, job_id, created_at').order('created_at', { ascending: false }).limit(5),
    ]);
    if (!usageRes.error && usageRes.data) setApplicationUsage(usageRes.data);
    if (!mockRes.error && mockRes.data) setMockUsage(mockRes.data);
    if (!jobsCountRes.error && jobsCountRes.count != null) setJobsOpenCount(jobsCountRes.count);
    if (!completedMocksRes.error && completedMocksRes.count != null) setCompletedMocksCount(completedMocksRes.count);
    if (!jobsRes.error && jobsRes.data) setRecentJobs(jobsRes.data);
    if (!appsRes.error && appsRes.data?.length) {
      const jobIds = [...new Set(appsRes.data.map((a) => a.job_id))];
      const { data: jobsData } = await supabase.from('jobs').select('id, title, company_name').in('id', jobIds);
      const jobMap = Object.fromEntries((jobsData ?? []).map((j) => [j.id, j]));
      setRecentApplications(appsRes.data.map((a) => ({
        id: a.id,
        jobId: a.job_id,
        jobTitle: jobMap[a.job_id]?.title ?? '—',
        company: jobMap[a.job_id]?.company_name ?? '—',
        appliedAt: formatAppliedAt(a.created_at),
        status: 'Applied',
      })));
    } else {
      setRecentApplications([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const recentJobsForList = useMemo(() => recentJobs.map((j) => ({
    id: j.id,
    title: j.title,
    company: j.company_name ?? '',
    location: j.location ?? '—',
    type: j.job_type ?? '—',
    postedAt: formatPostedAt(j.created_at),
    snippet: j.description ? j.description.slice(0, 120) + (j.description.length > 120 ? '…' : '') : '',
  })), [recentJobs]);

  const attemptsValue = applicationUsage?.used ?? '—';
  const attemptsNote = applicationUsage?.active
    ? (applicationUsage.limit >= 0
      ? `${applicationUsage.used} of ${applicationUsage.limit} application slots used`
      : `${applicationUsage.used} application attempts recorded`)
    : 'Plan is inactive';

  const completedMocksValue = completedMocksCount ?? '—';
  const completedMocksNote = mockUsage?.active
    ? (mockUsage.limit >= 0
      ? `${mockUsage.used} of ${mockUsage.limit} mocks used this subscription month`
      : `${mockUsage.used} mock slots used this period`)
    : 'Plan is inactive';

  const jobsOpenNote = jobsOpenCount != null
    ? `${jobsOpenCount} jobs currently open`
    : 'Open jobs are syncing';

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-bold text-[rgb(var(--nth-text-primary-light))]">Overview</h1>
        <p className="mt-1 text-sm text-slate-600">
          Track your progress, monitor completions, and quickly jump to your latest activity.
        </p>
      </section>

      {loading ? (
        <PageLoader size="md" label="Loading…" className="py-8" variant="dots" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <StatCard
              label="Completed Job Attempts"
              value={attemptsValue}
              note={attemptsNote}
              icon={HiClipboardDocumentCheck}
            />
            <StatCard
              label="Jobs Open"
              value={jobsOpenCount ?? '—'}
              note={jobsOpenNote}
              icon={HiBriefcase}
            />
            <StatCard
              label="Completed Mocks"
              value={completedMocksValue}
              note={completedMocksNote}
              icon={HiCheckCircle}
            />
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 className="text-lg font-semibold text-[rgb(var(--nth-text-primary-light))]">Recent jobs</h2>
              <Link
                to="/dashboard/jobs"
                className="text-sm font-medium text-slate-700 hover:text-slate-900 hover:underline"
              >
                View all
              </Link>
            </div>
            <RecentJobsList jobs={recentJobsForList} />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 className="text-lg font-semibold text-[rgb(var(--nth-text-primary-light))]">Recent applications</h2>
              <Link
                to="/dashboard/applications"
                className="text-sm font-medium text-slate-700 hover:text-slate-900 hover:underline"
              >
                View all
              </Link>
            </div>
            <RecentApplicationsList applications={recentApplications} />
          </section>
        </>
      )}
    </div>
  );
}
