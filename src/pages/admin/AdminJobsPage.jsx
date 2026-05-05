import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { formatApplyDeadlineShort } from '../../lib/jobApplicationDeadline';
import { PageLoader } from '../../components/ui/Loader';
import {
  HiPlus,
  HiXMark,
  HiBriefcase,
  HiBuildingOffice2,
  HiUsers,
  HiPencilSquare,
  HiChevronRight,
  HiMapPin,
  HiCalendarDays,
} from 'react-icons/hi2';

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

function statusBadgeClass(status) {
  if (status === 'open') return 'bg-emerald-50 text-emerald-800 ring-emerald-600/15';
  if (status === 'closed') return 'bg-slate-100 text-slate-700 ring-slate-500/10';
  return 'bg-amber-50 text-amber-900 ring-amber-600/15';
}

function detailBlock(label, value, { fullWidth = false } = {}) {
  const content = value != null && value !== '' ? value : '—';
  return (
    <div
      className={`rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 ${fullWidth ? 'md:col-span-2' : ''}`}
    >
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</dt>
      <dd className="text-sm font-medium text-slate-900 wrap-break-word">{content}</dd>
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
  const keySkills = Array.isArray(job.key_skills) ? job.key_skills : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 overflow-hidden overscroll-none">
      <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px]" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-detail-title"
        className="relative z-10 flex max-h-[100dvh] sm:max-h-[90vh] w-full sm:max-w-3xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200/90"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50/50 px-6 py-6 md:px-8 md:py-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600">Job details</p>
              <h2 id="job-detail-title" className="mt-1 text-xl font-black text-slate-900 tracking-tight sm:text-2xl wrap-break-word">
                {job.title}
              </h2>
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
                <HiBuildingOffice2 className="h-4 w-4 shrink-0 text-indigo-500" />
                <span className="truncate">{job.company_name || '—'}</span>
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusBadgeClass(job.status)}`}
                >
                  {STATUS_LABELS[job.status] ?? job.status}
                </span>
                {job.show_on_landing ? (
                  <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                    On landing
                  </span>
                ) : null}
                {job.location ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                    <HiMapPin className="h-3.5 w-3.5" />
                    {job.location}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 font-mono text-[10px] text-slate-400">ID · {job.id}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-white/90 hover:text-slate-800 hover:shadow-sm"
              aria-label="Close"
            >
              <HiXMark className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-6 md:px-8 md:py-7">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Overview</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {detailBlock('Show on landing', job.show_on_landing ? 'Yes' : 'No')}
            {detailBlock(
              'Hiring spotlight (home)',
              job.hiring_spotlight ? `Yes (order ${job.hiring_spotlight_order ?? '—'})` : 'No'
            )}
            {detailBlock('Audience tracks', formatTracks(job.audience_tracks))}
            {detailBlock('Tier / plans', formatPlans(job.allowed_plans))}
            {detailBlock('Job type', job.job_type)}
            {detailBlock('Salary range', job.salary_range)}
            {detailBlock(
              'Application deadline',
              formatApplyDeadlineShort(job.application_deadline_at, job.application_deadline) ?? formatDate(job.application_deadline),
            )}
            {detailBlock('Walk-in date', formatDate(job.walk_in_date))}
            {detailBlock(
              'Public application limit',
              job.application_limit != null ? String(job.application_limit) : 'Unlimited'
            )}
            {job.experience_level ? detailBlock('Experience level', job.experience_level) : null}
            {job.apply_link ? (
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 sm:col-span-2">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Apply link</dt>
                <dd className="text-sm">
                  <a
                    href={job.apply_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-indigo-600 hover:underline wrap-break-word"
                  >
                    {job.apply_link}
                  </a>
                </dd>
              </div>
            ) : null}
            {job.address ? (
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 sm:col-span-2">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Address / venue</dt>
                <dd className="text-sm text-slate-800 whitespace-pre-wrap">{job.address}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Description</h3>
            <div className="max-h-52 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {job.description || '—'}
            </div>
          </div>

          {keySkills.length > 0 ? (
            <div className="mt-8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Key skills (landing)</h3>
              <div className="flex flex-wrap gap-2">
                {keySkills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {requirements.length > 0 ? (
            <div className="mt-8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Requirements</h3>
              <ul className="space-y-2">
                {requirements.map((req, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <HiCalendarDays className="h-4 w-4 text-slate-400" />
              Created {formatDate(job.created_at)}
            </span>
            {job.updated_at && job.updated_at !== job.created_at ? (
              <span>Updated {formatDate(job.updated_at)}</span>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-slate-50/95 px-6 py-4 md:px-8">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={onClose}
              className="order-3 sm:order-none rounded-xl px-4 py-3 text-sm font-bold text-slate-600 ring-1 ring-slate-200 bg-white hover:bg-slate-50 sm:ml-auto"
            >
              Close
            </button>
            <Link
              to={`/admin/jobs/${job.id}/edit`}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200 bg-white hover:bg-slate-50"
              onClick={onClose}
            >
              <HiPencilSquare className="h-4 w-4" />
              Edit
            </Link>
            <Link
              to={`/admin/jobs/${job.id}/applicants`}
              className="nth-btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold shadow-md shadow-indigo-200/50"
              onClick={onClose}
            >
              <HiUsers className="h-4 w-4" />
              Applicants
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function JobRowDesktop({ job, onSelect }) {
  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={() => onSelect(job)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(job);
        }
      }}
      className="border-b border-slate-100 last:border-0 transition-colors hover:bg-indigo-50/40 cursor-pointer group"
    >
      <td className="px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
            <HiBriefcase className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors block wrap-break-word">
              {job.title}
            </span>
            <span className="text-slate-500 text-sm mt-0.5 block">{job.company_name || '—'}</span>
          </div>
        </div>
      </td>
      <td className="px-5 py-4 align-middle w-[1%] whitespace-nowrap">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusBadgeClass(job.status)}`}
        >
          {STATUS_LABELS[job.status] ?? job.status}
        </span>
      </td>
      <td className="px-5 py-4 align-middle w-[1%]" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <Link
            to={`/admin/jobs/${job.id}/applicants`}
            className="text-sm font-bold text-[hsl(var(--nth-primary))] hover:underline"
          >
            Applicants
          </Link>
          <Link
            to={`/admin/jobs/${job.id}/edit`}
            className="text-sm font-bold text-slate-600 hover:text-indigo-600"
          >
            Edit
          </Link>
        </div>
      </td>
      <td className="px-4 py-4 align-middle w-10 text-slate-300 group-hover:text-indigo-400 transition-colors">
        <HiChevronRight className="h-5 w-5" />
      </td>
    </tr>
  );
}

function JobCardMobile({ job, onSelect }) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.03] transition hover:border-indigo-200 hover:shadow-md overflow-hidden">
      <button
        type="button"
        onClick={() => onSelect(job)}
        className="w-full text-left p-4 transition active:bg-slate-50/80"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="font-bold text-slate-900 block wrap-break-word">{job.title}</span>
            <span className="text-slate-500 text-sm mt-1 block">{job.company_name || '—'}</span>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${statusBadgeClass(job.status)}`}
          >
            {STATUS_LABELS[job.status] ?? job.status}
          </span>
        </div>
        <p className="mt-3 text-xs font-semibold text-indigo-600">View details</p>
      </button>
      <div className="flex gap-4 px-4 pb-4 text-sm font-bold border-t border-slate-50">
        <Link to={`/admin/jobs/${job.id}/applicants`} className="text-[hsl(var(--nth-primary))] py-2">
          Applicants
        </Link>
        <Link to={`/admin/jobs/${job.id}/edit`} className="text-slate-600 py-2">
          Edit
        </Link>
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
      const { data, error } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
      if (!error) setJobs(data ?? []);
      setLoading(false);
    };
    fetchJobs();
  }, []);

  const stats = useMemo(() => {
    const open = jobs.filter((j) => j.status === 'open').length;
    const draft = jobs.filter((j) => j.status === 'draft').length;
    const closed = jobs.filter((j) => j.status === 'closed').length;
    return { total: jobs.length, open, draft, closed };
  }, [jobs]);

  if (loading) return <PageLoader size="md" label="Loading jobs…" className="py-12" />;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/40 p-6 md:p-8 shadow-sm ring-1 ring-slate-900/[0.04] mb-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600">Admin</p>
            <h1 className="mt-1 text-3xl font-black text-slate-900 tracking-tight">Jobs</h1>
            <p className="mt-2 text-slate-600 text-sm max-w-xl leading-relaxed">
              Manage listings, landing visibility, and applicants. Tap a row to view full details—location,
              tier, description, and limits.
            </p>
          </div>
          <Link
            to="/admin/jobs/create"
            className="inline-flex items-center justify-center gap-2 self-start rounded-2xl nth-btn-primary px-6 py-3.5 text-sm font-bold shadow-lg shadow-indigo-300/40"
          >
            <HiPlus className="h-5 w-5" />
            Add job
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, accent: 'text-slate-900' },
            { label: 'Open', value: stats.open, accent: 'text-emerald-700' },
            { label: 'Draft', value: stats.draft, accent: 'text-amber-800' },
            { label: 'Closed', value: stats.closed, accent: 'text-slate-600' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl bg-white/90 px-4 py-3 ring-1 ring-slate-200/80 shadow-sm"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{s.label}</p>
              <p className={`text-2xl font-black tabular-nums mt-1 ${s.accent}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="hidden md:block rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-sm ring-1 ring-slate-900/[0.03]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/90">
              <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Role</th>
              <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 w-[1%] whitespace-nowrap">
                Status
              </th>
              <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 w-[1%] whitespace-nowrap">
                Actions
              </th>
              <th className="w-10 px-2" aria-hidden />
            </tr>
          </thead>
          <tbody>{jobs.map((j) => <JobRowDesktop key={j.id} job={j} onSelect={setSelectedJob} />)}</tbody>
        </table>
        {jobs.length === 0 && (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-4">
              <HiBriefcase className="h-7 w-7" />
            </div>
            <p className="text-slate-700 font-bold">No jobs yet</p>
            <p className="text-slate-500 text-sm mt-1 mb-6">Create a listing to show on the site or dashboard.</p>
            <Link to="/admin/jobs/create" className="nth-btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold">
              <HiPlus className="h-4 w-4" />
              Add job
            </Link>
          </div>
        )}
      </div>

      <div className="md:hidden space-y-3">
        {jobs.map((j) => (
          <JobCardMobile key={j.id} job={j} onSelect={setSelectedJob} />
        ))}
        {jobs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
            <p className="text-slate-600 font-medium">No jobs yet.</p>
            <Link
              to="/admin/jobs/create"
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-indigo-600"
            >
              <HiPlus className="h-4 w-4" />
              Add your first job
            </Link>
          </div>
        )}
      </div>

      {selectedJob && <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </div>
  );
}
