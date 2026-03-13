import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { PageLoader } from '../../components/ui/Loader';
import { HiPlus, HiXMark } from 'react-icons/hi2';

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

function formatDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Renders a label/value row (not a component — avoids static-components lint). */
function detailRow(label, value) {
  const content = value != null && value !== '' ? value : '—';
  return (
    <div key={label} className="py-2 border-b border-slate-100 last:border-0">
      <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-sm text-slate-900 break-words">{content}</dd>
    </div>
  );
}

function JobDetailModal({ job, onClose }) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, []);

  if (!job) return null;

  const requirements = Array.isArray(job.requirements) ? job.requirements : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden overscroll-none">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" aria-hidden onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 truncate">{job.title}</h2>
            <p className="text-sm text-slate-600 mt-0.5">{job.company_name}</p>
            <p className="text-xs text-slate-400 mt-1 font-mono">ID: {job.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors shrink-0"
            aria-label="Close"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 overscroll-contain px-5 py-4">
          <dl className="space-y-0">
            <div className="py-2 border-b border-slate-100">
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Status</dt>
              <dd className="text-sm">
                <span
                  className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    job.status === 'open'
                      ? 'bg-emerald-100 text-emerald-800'
                      : job.status === 'closed'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {STATUS_LABELS[job.status] ?? job.status}
                </span>
              </dd>
            </div>
            {detailRow('Show on landing', job.show_on_landing ? 'Yes' : 'No')}
            {detailRow('Audience tracks', formatTracks(job.audience_tracks))}
            {detailRow('Tier / allowed plans', formatPlans(job.allowed_plans))}
            {detailRow('Job type', job.job_type)}
            {detailRow('Location', job.location)}
            {detailRow('Salary range', job.salary_range)}
            {detailRow('Application deadline', formatDate(job.application_deadline))}
            {detailRow('Walk-in date', formatDate(job.walk_in_date))}
            {detailRow('Application limit', job.application_limit != null ? String(job.application_limit) : null)}
            {job.experience_level && detailRow('Experience level', job.experience_level)}
            {job.apply_link && (
              <div className="py-2 border-b border-slate-100">
                <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Apply link</dt>
                <dd className="text-sm break-words">
                  <a href={job.apply_link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all">
                    {job.apply_link}
                  </a>
                </dd>
              </div>
            )}
            {job.address && (
              <div className="py-2 border-b border-slate-100">
                <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Address / venue</dt>
                <dd className="text-sm text-slate-900 whitespace-pre-wrap">{job.address}</dd>
              </div>
            )}
            <div className="py-2 border-b border-slate-100">
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Description</dt>
              <dd className="text-sm text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto rounded-lg bg-slate-50 p-3">
                {job.description || '—'}
              </dd>
            </div>
            {requirements.length > 0 && (
              <div className="py-2 border-b border-slate-100 last:border-0">
                <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Requirements</dt>
                <dd>
                  <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                    {requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
            {detailRow('Created', formatDate(job.created_at))}
            {job.updated_at && job.updated_at !== job.created_at && detailRow('Updated', formatDate(job.updated_at))}
          </dl>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 shrink-0">
          <Link
            to={`/admin/jobs/${job.id}/applicants`}
            className="nth-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg"
            onClick={onClose}
          >
            Applicants
          </Link>
          <Link
            to={`/admin/jobs/${job.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            onClick={onClose}
          >
            Edit job
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-200 ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);

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
      <p className="text-sm text-slate-500 mb-3">Click a row for full details (location, tier, description, etc.).</p>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Job</th>
              <th className="px-4 py-3 font-semibold text-slate-700 w-[1%] whitespace-nowrap">Status</th>
              <th className="px-4 py-3 font-semibold text-slate-700 w-[1%] whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr
                key={j.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedJob(j)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedJob(j);
                  }
                }}
                className="border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-900 block">{j.title}</span>
                  <span className="text-slate-500 text-xs mt-0.5 block">{j.company_name || '—'}</span>
                </td>
                <td className="px-4 py-3 align-top">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
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
                <td className="px-4 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap gap-3">
                      <Link
                        to={`/admin/jobs/${j.id}/applicants`}
                        className="text-[hsl(var(--nth-primary))] hover:underline font-medium"
                      >
                        Applicants
                      </Link>
                      <Link
                        to={`/admin/jobs/${j.id}/edit`}
                        className="text-slate-600 hover:underline font-medium"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {jobs.length === 0 && (
          <p className="px-4 py-8 text-center text-slate-500">No jobs yet. Create one to get started.</p>
        )}
      </div>

      {selectedJob && <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </div>
  );
}
