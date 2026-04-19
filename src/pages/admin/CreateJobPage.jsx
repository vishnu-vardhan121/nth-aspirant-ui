import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft } from 'react-icons/hi2';
import { useAppSelector } from '../../store/hooks';
import { supabase } from '../../lib/supabase';
import {
  jobCheckboxClass,
  jobHintClass,
  jobInputClass,
  jobLabelClass,
  jobSectionCard,
  jobSectionHint,
  jobSectionTitle,
  jobSelectClass,
  jobTextareaClass,
} from './jobFormStyles';

const DRAFT_STORAGE_KEY = 'admin-create-job-draft';

const defaultForm = {
  title: '',
  company_name: '',
  description: '',
  location: '',
  address: '',
  job_type: 'Full-time',
  salary_range: '',
  apply_link: '',
  application_deadline: '',
  walk_in_date: '',
  audience_tracks: ['fresher'],
  job_tier: 'free',
  allowed_plans: [],
  show_on_landing: false,
  status: 'open',
  application_limit: '',
  hiring_spotlight: false,
  hiring_spotlight_order: 100,
};

const JOB_TYPES = ['Full-time', 'Part-time', 'Internship', 'Contract'];
const TRACK_OPTIONS = [
  { value: 'fresher', label: 'Fresher' },
  { value: 'experienced', label: 'Experienced' },
];
const JOB_TIER_OPTIONS = [
  { value: 'free', label: 'Free (anyone can apply)' },
  { value: 'premium', label: 'Premium (user must have plan to apply)' },
];
const PLAN_OPTIONS = [
  { value: 'base', label: 'Base' },
  { value: 'silver', label: 'Silver' },
  { value: 'gold', label: 'Gold' },
];
const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'draft', label: 'Draft' },
];

export default function CreateJobPage() {
  const currentAdmin = useAppSelector((state) => state.admin.profile);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [form, setFormState] = useState(() => {
    try {
      const stored = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaultForm, ...parsed };
      }
    } catch (_) {}
    return defaultForm;
  });

  const setForm = useCallback((updater) => {
    setFormState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  }, []);


  const toggleTrack = (track) => {
    setForm((p) => {
      const next = p.audience_tracks.includes(track)
        ? p.audience_tracks.filter((t) => t !== track)
        : [...p.audience_tracks, track];
      const atLeastOne = next.length ? next : TRACK_OPTIONS.map((o) => o.value).filter((t) => t !== track);
      return { ...p, audience_tracks: atLeastOne };
    });
  };

  const togglePlan = (plan) => {
    setForm((p) => {
      const next = p.allowed_plans.includes(plan)
        ? p.allowed_plans.filter((x) => x !== plan)
        : [...p.allowed_plans, plan];
      return { ...p, allowed_plans: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    const titleT = form.title.trim();
    const companyT = form.company_name.trim();
    if (!titleT || titleT.length < 2) {
      setMessage({ type: 'error', text: 'Job title is required (at least 2 characters).' });
      return;
    }
    if (!companyT || companyT.length < 2) {
      setMessage({ type: 'error', text: 'Company name is required (at least 2 characters).' });
      return;
    }
    const applyT = form.apply_link.trim();
    if (applyT) {
      try {
        new URL(applyT.startsWith('http') ? applyT : `https://${applyT}`);
      } catch {
        setMessage({ type: 'error', text: 'Apply link must be a valid URL (e.g. https://…).' });
        return;
      }
    }
    if (form.job_tier === 'premium' && !form.allowed_plans.length) {
      setMessage({ type: 'error', text: 'Select at least one plan for Premium jobs.' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('jobs').insert({
        created_by: currentAdmin?.id ?? null,
        title: titleT,
        company_name: companyT,
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        address: form.address.trim() || null,
        job_type: form.job_type.trim() || null,
        salary_range: form.salary_range.trim() || null,
        apply_link: applyT ? (applyT.startsWith('http') ? applyT : `https://${applyT}`) : null,
        application_deadline: form.application_deadline || null,
        walk_in_date: form.walk_in_date || null,
        audience_tracks: form.audience_tracks,
        allowed_plans: form.job_tier === 'premium' && form.allowed_plans.length ? form.allowed_plans : null,
        show_on_landing: form.show_on_landing,
        status: form.status,
        hiring_spotlight: form.hiring_spotlight,
        hiring_spotlight_order: Number.isFinite(Number(form.hiring_spotlight_order))
          ? Number(form.hiring_spotlight_order)
          : 100,
        application_limit: (() => {
          const s = String(form.application_limit ?? '').trim();
          if (s === '') return null;
          const n = parseInt(s, 10);
          return Number.isFinite(n) ? n : null;
        })(),
      });
      if (error) throw error;
      try {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch (_) {}
      setMessage({ type: 'success', text: 'Job created.' });
      navigate('/admin/jobs', { replace: true });
    } catch (err) {
      setMessage({ type: 'error', text: err?.message ?? 'Failed to create job.' });
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <button
        type="button"
        onClick={() => navigate('/admin/jobs')}
        className="mb-6 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 ring-1 ring-slate-200 bg-white hover:bg-slate-50 transition-colors"
      >
        <HiArrowLeft className="h-4 w-4" />
        Back to jobs
      </button>

      <div className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600">New listing</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900 tracking-tight">Create job</h1>
        <p className={jobSectionHint}>
          Free tier = anyone in the selected tracks can apply from the dashboard. Premium = only users with
          one of the plans you pick. Public apply caps only affect the website job form.
        </p>
      </div>

      {typeof sessionStorage !== 'undefined' && sessionStorage.getItem(DRAFT_STORAGE_KEY) && (
        <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-950">
          <span className="font-semibold">Draft restored.</span> Your edits save automatically—switch tabs safely.{' '}
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.removeItem(DRAFT_STORAGE_KEY);
              } catch (_) {}
              setFormState(defaultForm);
            }}
            className="font-bold text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-900"
          >
            Discard draft
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className={jobSectionCard}>
          <h2 className={jobSectionTitle}>Role basics</h2>
          <p className={jobSectionHint}>Title and company appear on listings and SEO.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={jobLabelClass}>Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                required
                minLength={2}
                maxLength={200}
                className={jobInputClass}
                placeholder="e.g. Frontend Developer"
              />
            </div>
            <div>
              <label className={jobLabelClass}>Company name *</label>
              <input
                type="text"
                value={form.company_name}
                onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
                required
                minLength={2}
                maxLength={150}
                className={jobInputClass}
                placeholder="Employer name"
              />
            </div>
            <div className="md:col-span-2">
              <label className={jobLabelClass}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={5}
                className={jobTextareaClass}
                placeholder="Role summary, expectations, stack…"
              />
            </div>
          </div>
        </section>

        <section className={jobSectionCard}>
          <h2 className={jobSectionTitle}>Location &amp; compensation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={jobLabelClass}>Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                className={jobInputClass}
                placeholder="e.g. Bangalore, Remote"
              />
            </div>
            <div>
              <label className={jobLabelClass}>Job type</label>
              <select
                value={form.job_type}
                onChange={(e) => setForm((p) => ({ ...p, job_type: e.target.value }))}
                className={jobSelectClass}
              >
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={jobLabelClass}>Address / venue</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                rows={2}
                className={jobTextareaClass}
                placeholder="Interview address or office location (optional)"
              />
            </div>
            <div className="md:col-span-2">
              <label className={jobLabelClass}>Salary range</label>
              <input
                type="text"
                value={form.salary_range}
                onChange={(e) => setForm((p) => ({ ...p, salary_range: e.target.value }))}
                className={jobInputClass}
                placeholder="e.g. ₹X–Y LPA"
              />
            </div>
          </div>
        </section>

        <section className={jobSectionCard}>
          <h2 className={jobSectionTitle}>Dates &amp; apply flow</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={jobLabelClass}>Last date to apply</label>
              <input
                type="date"
                value={form.application_deadline}
                onChange={(e) => setForm((p) => ({ ...p, application_deadline: e.target.value }))}
                className={jobInputClass}
              />
              <p className={jobHintClass}>After this date, the public job page treats applications as closed.</p>
            </div>
            <div>
              <label className={jobLabelClass}>Walk-in date</label>
              <input
                type="date"
                value={form.walk_in_date}
                onChange={(e) => setForm((p) => ({ ...p, walk_in_date: e.target.value }))}
                className={jobInputClass}
              />
              <p className={jobHintClass}>Optional. Shown when relevant.</p>
            </div>
            <div className="md:col-span-2">
              <label className={jobLabelClass}>External apply link</label>
              <input
                type="url"
                value={form.apply_link}
                onChange={(e) => setForm((p) => ({ ...p, apply_link: e.target.value }))}
                className={jobInputClass}
                placeholder="https://… (optional — overrides built-in apply form)"
              />
              <p className={jobHintClass}>
                If set, the job page &quot;Apply&quot; button opens this URL instead of your on-site form.
              </p>
            </div>
            <div className="md:col-span-2">
              <label className={jobLabelClass}>Public application limit (job page)</label>
              <input
                type="number"
                min="0"
                value={form.application_limit}
                onChange={(e) => setForm((p) => ({ ...p, application_limit: e.target.value }))}
                className={jobInputClass}
                placeholder="e.g. 200 (optional)"
              />
              <p className={jobHintClass}>
                Caps submissions from the public job page only. Leave blank for unlimited. Use 0 to disable
                public applies while keeping the listing visible.
              </p>
            </div>
          </div>
        </section>

        <section className={jobSectionCard}>
          <h2 className={jobSectionTitle}>Audience &amp; visibility</h2>
          <div className="space-y-6">
            <div>
              <label className={jobLabelClass}>Audience tracks *</label>
              <p className={jobHintClass + ' mb-3'}>At least one track required.</p>
              <div className="flex flex-wrap gap-5">
                {TRACK_OPTIONS.map((o) => (
                  <label key={o.value} className="inline-flex items-center gap-2.5 cursor-pointer font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={form.audience_tracks.includes(o.value)}
                      onChange={() => toggleTrack(o.value)}
                      className={jobCheckboxClass}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={jobLabelClass}>Job tier</label>
                <select
                  value={form.job_tier}
                  onChange={(e) => setForm((p) => ({ ...p, job_tier: e.target.value }))}
                  className={jobSelectClass}
                >
                  {JOB_TIER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <p className={jobHintClass}>
                  Premium restricts who can see the job in the app; pick plans below.
                </p>
              </div>
              <div>
                <label className={jobLabelClass}>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  className={jobSelectClass}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {form.job_tier === 'premium' && (
              <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-5">
                <label className={jobLabelClass}>Allowed plans (Premium)</label>
                <p className={jobHintClass + ' mb-3'}>Only these plans can view and apply from the dashboard.</p>
                <div className="flex flex-wrap gap-5">
                  {PLAN_OPTIONS.map((o) => (
                    <label key={o.value} className="inline-flex items-center gap-2.5 cursor-pointer font-medium text-slate-800">
                      <input
                        type="checkbox"
                        checked={form.allowed_plans.includes(o.value)}
                        onChange={() => togglePlan(o.value)}
                        className={jobCheckboxClass}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <input
                type="checkbox"
                id="show_on_landing"
                checked={form.show_on_landing}
                onChange={(e) => setForm((p) => ({ ...p, show_on_landing: e.target.checked }))}
                className={jobCheckboxClass + ' mt-0.5'}
              />
              <span>
                <span className="font-bold text-slate-900">Show on landing page</span>
                <span className={jobHintClass + ' block mt-0.5'}>
                  Free vs Premium tabs on the marketing site; premium listings require an upgrade to apply.
                </span>
              </span>
            </label>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  id="create_hiring_spotlight"
                  checked={form.hiring_spotlight}
                  onChange={(e) => setForm((p) => ({ ...p, hiring_spotlight: e.target.checked }))}
                  className={jobCheckboxClass + ' mt-0.5'}
                />
                <span>
                  <span className="font-bold text-slate-900">Hiring spotlight on home page</span>
                  <span className={jobHintClass + ' block mt-0.5'}>
                    After saving, edit the job to post notices. Shortlisted names come from applicants you mark in
                    Admin → Applicants.
                  </span>
                </span>
              </label>
              <div>
                <label className={jobLabelClass}>Spotlight sort order</label>
                <input
                  type="number"
                  value={form.hiring_spotlight_order}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, hiring_spotlight_order: e.target.value }))
                  }
                  className={`${jobInputClass} max-w-[12rem]`}
                  placeholder="100"
                />
                <p className={jobHintClass}>Lower numbers appear first.</p>
              </div>
            </div>
          </div>
        </section>

        {message.text ? (
          <div
            className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
              message.type === 'error' ? 'bg-red-50 text-red-800 ring-1 ring-red-100' : 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100'
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
          <button
            type="button"
            onClick={() => navigate('/admin/jobs')}
            className="rounded-xl px-5 py-3.5 text-sm font-bold text-slate-600 ring-1 ring-slate-200 bg-white hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="nth-btn-primary rounded-xl px-8 py-3.5 text-sm font-bold shadow-lg shadow-indigo-300/40 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create job'}
          </button>
        </div>
      </form>
    </div>
  );
}
