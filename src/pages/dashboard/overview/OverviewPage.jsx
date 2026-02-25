import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { PageLoader } from '../../../components/ui/Loader';
import StatCard from '../components/StatCard';
import RecentJobsList from './components/RecentJobsList';
import RecentApplicationsList from './components/RecentApplicationsList';

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
  const [recentJobs, setRecentJobs] = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mockRegistering, setMockRegistering] = useState(false);
  const [mockMessage, setMockMessage] = useState({ type: '', text: '' });

  const fetchData = async () => {
    const [usageRes, mockRes, jobsCountRes, jobsRes, appsRes] = await Promise.all([
      supabase.rpc('get_application_usage'),
      supabase.rpc('get_mock_usage'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('jobs').select('id, title, company_name, location, job_type, description, created_at').eq('status', 'open').order('created_at', { ascending: false }).limit(5),
      supabase.from('applications').select('id, job_id, created_at').order('created_at', { ascending: false }).limit(5),
    ]);
    if (!usageRes.error && usageRes.data) setApplicationUsage(usageRes.data);
    if (!mockRes.error && mockRes.data) setMockUsage(mockRes.data);
    if (!jobsCountRes.error && jobsCountRes.count != null) setJobsOpenCount(jobsCountRes.count);
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
    fetchData();
  }, []);

  const handleRegisterMock = async () => {
    setMockMessage({ type: '', text: '' });
    setMockRegistering(true);
    const { data } = await supabase.rpc('register_mock', { p_availability_notes: null });
    setMockRegistering(false);
    if (data?.ok) {
      setMockMessage({ type: 'success', text: 'Registered for a mock interview.' });
      supabase.rpc('get_mock_usage').then(({ data: d }) => { if (d) setMockUsage(d); });
    } else {
      setMockMessage({ type: 'error', text: data?.error ?? 'Could not register.' });
    }
  };

  const recentJobsForList = useMemo(() => recentJobs.map((j) => ({
    id: j.id,
    title: j.title,
    company: j.company_name ?? '',
    location: j.location ?? '—',
    type: j.job_type ?? '—',
    postedAt: formatPostedAt(j.created_at),
    snippet: j.description ? j.description.slice(0, 120) + (j.description.length > 120 ? '…' : '') : '',
  })), [recentJobs]);

  const applicationsLabel = applicationUsage?.active && applicationUsage.limit >= 0
    ? `Applications this month`
    : `Applications`;
  const applicationsValue = applicationUsage?.active && applicationUsage.limit >= 0
    ? `${applicationUsage.used} / ${applicationUsage.limit}`
    : (applicationUsage?.used ?? '—');

  const mocksLabel = 'Mocks this period';
  const mocksValue = mockUsage?.active
    ? (mockUsage.limit >= 0 ? `${mockUsage.used} / ${mockUsage.limit}` : mockUsage.used)
    : '—';
  const canRegisterMock = mockUsage?.active && (mockUsage.limit < 0 || mockUsage.used < mockUsage.limit);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-[rgb(var(--nth-text-primary-light))]">Overview</h1>

      {loading ? (
        <PageLoader size="md" label="Loading…" className="py-8" variant="dots" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label={applicationsLabel} value={applicationsValue} />
            <StatCard label="Jobs open" value={jobsOpenCount ?? '—'} />
            <StatCard label={mocksLabel} value={mocksValue} />
          </div>

          {mockUsage?.active && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[rgb(var(--nth-text-primary-light))] mb-2">Mock interviews</h2>
              <p className="text-sm text-slate-600 mb-3">
                You can register for mock interviews within your plan limit. Admin will schedule and mark them as conducted.
              </p>
              {mockMessage.text && (
                <p className={`text-sm mb-3 ${mockMessage.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                  {mockMessage.text}
                </p>
              )}
              <button
                type="button"
                onClick={handleRegisterMock}
                disabled={!canRegisterMock || mockRegistering}
                className="nth-btn-primary px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {mockRegistering ? 'Registering…' : canRegisterMock ? 'Register for a mock' : 'Mock limit reached'}
              </button>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[rgb(var(--nth-text-primary-light))]">Recent jobs</h2>
              <Link
                to="/dashboard/jobs"
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                View all
              </Link>
            </div>
            <RecentJobsList jobs={recentJobsForList} />
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[rgb(var(--nth-text-primary-light))]">Recent applications</h2>
              <Link
                to="/dashboard/applications"
                className="text-sm font-medium text-indigo-600 hover:underline"
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
