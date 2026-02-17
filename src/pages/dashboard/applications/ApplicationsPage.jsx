import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { PageLoader } from '../../../components/ui/Loader';
import ApplicationsList from './components/ApplicationsList';

function formatAppliedAt(createdAt) {
  if (!createdAt) return '—';
  const d = new Date(createdAt);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplications = async () => {
      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select('id, job_id, created_at, status')
        .order('created_at', { ascending: false });
      if (appsError) {
        setLoading(false);
        return;
      }
      const list = appsData ?? [];
      if (list.length === 0) {
        setApplications([]);
        setLoading(false);
        return;
      }
      const jobIds = [...new Set(list.map((a) => a.job_id))];
      const { data: jobsData } = await supabase.from('jobs').select('id, title, company_name').in('id', jobIds);
      const jobMap = Object.fromEntries((jobsData ?? []).map((j) => [j.id, j]));
      const statusLabel = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Applied');
      setApplications(list.map((a) => ({
        id: a.id,
        jobId: a.job_id,
        jobTitle: jobMap[a.job_id]?.title ?? '—',
        company: jobMap[a.job_id]?.company_name ?? '—',
        appliedAt: formatAppliedAt(a.created_at),
        status: statusLabel(a.status) || 'Applied',
      })));
      setLoading(false);
    };
    fetchApplications();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[rgb(var(--nth-text-primary-light))]">My Applications</h1>
      {loading ? (
        <PageLoader size="md" label="Loading…" className="py-8" />
      ) : (
        <ApplicationsList applications={applications} />
      )}
    </div>
  );
}
