import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { PageLoader } from '../../components/ui/Loader';
import { HiBriefcase, HiPlus } from 'react-icons/hi2';

const STATUS_LABELS = { draft: 'Draft', open: 'Open', closed: 'Closed' };
const TRACK_LABELS = { fresher: 'Fresher', experienced: 'Experienced' };
const PLAN_LABELS = { base: 'Base', silver: 'Silver', gold: 'Gold' };

function formatTracks(arr) {
  if (!Array.isArray(arr) || !arr.length) return '—';
  return arr.map((t) => TRACK_LABELS[t] ?? t).join(', ');
}

function formatPlans(arr) {
  if (!Array.isArray(arr) || !arr.length) return 'Free';
  return arr.map((p) => PLAN_LABELS[p] ?? p).join(', ');
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error) setJobs(data ?? []);
      setLoading(false);
    };
    fetchJobs();
  }, []);

  if (loading) return <PageLoader size="md" label="Loading jobs…" className="py-12" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Jobs</h1>
        <Link
          to="/admin/jobs/create"
          className="nth-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium"
        >
          <HiPlus className="w-5 h-5" />
          Add job
        </Link>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Title</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Company</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Apply by</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Track</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Tier</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Landing</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-b border-slate-100">
                <td className="px-4 py-3 text-slate-900">{j.title}</td>
                <td className="px-4 py-3 text-slate-600">{j.company_name}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{j.application_deadline ? new Date(j.application_deadline).toLocaleDateString('en-IN') : '—'}</td>
                <td className="px-4 py-3 text-slate-600">{formatTracks(j.audience_tracks)}</td>
                <td className="px-4 py-3 text-slate-600">{formatPlans(j.allowed_plans)}</td>
                <td className="px-4 py-3 text-slate-600">{j.show_on_landing ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      j.status === 'open'
                        ? 'bg-emerald-100 text-emerald-800'
                        : j.status === 'closed'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {STATUS_LABELS[j.status] ?? j.status}
                  </span>
                </td>
                <td className="px-4 py-3 flex flex-wrap gap-3">
                  <Link
                    to={`/admin/jobs/${j.id}/applicants`}
                    className="text-[rgb(var(--nth-primary))] hover:underline font-medium"
                  >
                    Applicants
                  </Link>
                  <Link
                    to={`/admin/jobs/${j.id}/edit`}
                    className="text-slate-600 hover:underline font-medium"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {jobs.length === 0 && (
          <p className="px-4 py-8 text-center text-slate-500">No jobs yet. Create one to get started.</p>
        )}
      </div>
    </div>
  );
}
