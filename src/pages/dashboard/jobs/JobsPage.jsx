import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { PageLoader } from '../../../components/ui/Loader';
import JobsList from './components/JobsList';

function formatPostedAt(createdAt) {
  if (!createdAt) return '—';
  const d = new Date(createdAt);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isApplicationExpired(deadlineStr) {
  if (!deadlineStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(deadlineStr);
  deadline.setHours(0, 0, 0, 0);
  return today > deadline;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState(null); // { used, limit, active }
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());

  useEffect(() => {
    const fetchJobs = async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, company_name, description, location, job_type, salary_range, created_at, application_deadline, walk_in_date, address, apply_link')
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      if (!error) setJobs(data ?? []);
      setLoading(false);
    };
    fetchJobs();
  }, []);

  useEffect(() => {
    const fetchUsage = async () => {
      const { data, error } = await supabase.rpc('get_application_usage');
      if (!error && data) setUsage(data);
    };
    fetchUsage();
  }, []);

  useEffect(() => {
    const fetchApplied = async () => {
      const { data, error } = await supabase.from('applications').select('job_id');
      if (!error && data) setAppliedJobIds(new Set(data.map((r) => r.job_id)));
    };
    fetchApplied();
  }, []);

  const jobsForList = useMemo(() => jobs.map((j) => ({
    id: j.id,
    title: j.title,
    company: j.company_name ?? '',
    location: j.location ?? '—',
    type: j.job_type ?? '—',
    postedAt: formatPostedAt(j.created_at),
    snippet: j.description ? j.description.slice(0, 120) + (j.description.length > 120 ? '…' : '') : '',
    applicationDeadline: formatDate(j.application_deadline),
    applicationDeadlineRaw: j.application_deadline,
    walkInDate: formatDate(j.walk_in_date),
    address: j.address ?? '',
    applyLink: j.apply_link ?? '',
    isExpired: isApplicationExpired(j.application_deadline),
  })), [jobs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--nth-text-primary-light))]">Find Work</h1>
          <p className="text-[rgb(var(--nth-text-secondary-light))] mt-1">
            Browse open positions tailored for you.
          </p>
        </div>
      </div>

      {loading ? (
        <PageLoader size="md" label="Loading jobs…" className="py-8" />
      ) : (
        <JobsList
          jobs={jobsForList}
          usage={usage}
          appliedJobIds={appliedJobIds}
          onUsageChange={() => {
            supabase.rpc('get_application_usage').then(({ data }) => {
              if (data) setUsage(data);
            });
            supabase.from('applications').select('job_id').then(({ data }) => {
              if (data) setAppliedJobIds(new Set(data.map((r) => r.job_id)));
            });
          }}
        />
      )}
    </div>
  );
}
