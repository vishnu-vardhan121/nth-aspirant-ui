import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { supabase } from '../../lib/supabase';
import { PageLoader, ButtonLoader } from '../../components/ui/Loader';
import { HiArrowLeft } from 'react-icons/hi2';

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
  { value: 'closed', label: 'Closed' },
];

export default function EditJobPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [form, setForm] = useState({
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
  });

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

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const fetchJob = async () => {
      const { data, error } = await supabase.from('jobs').select('*').eq('id', id).single();
      if (error) {
        setMessage({ type: 'error', text: error.message ?? 'Job not found.' });
        setLoading(false);
        return;
      }
      if (data) {
        setForm({
          title: data.title ?? '',
          company_name: data.company_name ?? '',
          description: data.description ?? '',
          location: data.location ?? '',
          address: data.address ?? '',
          job_type: data.job_type ?? 'Full-time',
          salary_range: data.salary_range ?? '',
          apply_link: data.apply_link ?? '',
          application_deadline: data.application_deadline ?? '',
          walk_in_date: data.walk_in_date ?? '',
          audience_tracks: Array.isArray(data.audience_tracks) && data.audience_tracks.length ? data.audience_tracks : ['fresher'],
          job_tier: (data.allowed_plans && data.allowed_plans.length) ? 'premium' : 'free',
          allowed_plans: Array.isArray(data.allowed_plans) ? data.allowed_plans : [],
          show_on_landing: data.show_on_landing ?? false,
          status: data.status ?? 'open',
        });
      }
      setLoading(false);
    };
    fetchJob();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!id) return;
    setMessage({ type: '', text: '' });
    if (form.job_tier === 'premium' && !form.allowed_plans.length) {
      setMessage({ type: 'error', text: 'Select at least one plan for Premium jobs.' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          title: form.title.trim(),
          company_name: form.company_name.trim(),
          description: form.description.trim() || null,
          location: form.location.trim() || null,
          address: form.address.trim() || null,
          job_type: form.job_type.trim() || null,
          salary_range: form.salary_range.trim() || null,
          apply_link: form.apply_link.trim() || null,
          application_deadline: form.application_deadline || null,
          walk_in_date: form.walk_in_date || null,
          audience_tracks: form.audience_tracks,
          allowed_plans: form.job_tier === 'premium' && form.allowed_plans.length ? form.allowed_plans : null,
          show_on_landing: form.show_on_landing,
          status: form.status,
        })
        .eq('id', id);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Job updated.' });
      navigate('/admin/jobs', { replace: true });
    } catch (err) {
      setMessage({ type: 'error', text: err?.message ?? 'Failed to update job.' });
    }
    setSubmitting(false);
  };

  if (loading) return <PageLoader size="md" label="Loading job…" className="py-12" />;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/admin/jobs')}
        className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 text-sm mb-6"
      >
        <HiArrowLeft className="w-4 h-4" />
        Back to jobs
      </button>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Edit job</h1>

      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            placeholder="e.g. Frontend Developer"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Company name *</label>
          <input
            type="text"
            value={form.company_name}
            onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            placeholder="Company name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            placeholder="Job description"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            placeholder="e.g. Bangalore, Remote"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Address / Venue</label>
          <textarea
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            placeholder="Full address for interview or work location"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Last date to apply</label>
          <input
            type="date"
            value={form.application_deadline}
            onChange={(e) => setForm((p) => ({ ...p, application_deadline: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Walk-in date</label>
          <input
            type="date"
            value={form.walk_in_date}
            onChange={(e) => setForm((p) => ({ ...p, walk_in_date: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Job type</label>
          <select
            value={form.job_type}
            onChange={(e) => setForm((p) => ({ ...p, job_type: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
          >
            {JOB_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Salary range</label>
          <input
            type="text"
            value={form.salary_range}
            onChange={(e) => setForm((p) => ({ ...p, salary_range: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            placeholder="e.g. ₹X–Y LPA"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Apply / Job link</label>
          <input
            type="url"
            value={form.apply_link}
            onChange={(e) => setForm((p) => ({ ...p, apply_link: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            placeholder="https://… (URL for Apply button)"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Audience tracks *</label>
          <p className="text-xs text-slate-500 mb-2">Select one or both.</p>
          <div className="flex flex-wrap gap-4">
            {TRACK_OPTIONS.map((o) => (
              <label key={o.value} className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.audience_tracks.includes(o.value)}
                  onChange={() => toggleTrack(o.value)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-slate-700">{o.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Job tier</label>
          <select
            value={form.job_tier}
            onChange={(e) => setForm((p) => ({ ...p, job_tier: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
          >
            {JOB_TIER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {form.job_tier === 'premium' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Allowed plans (Premium)</label>
            <p className="text-xs text-slate-500 mb-2">Select one or more.</p>
            <div className="flex flex-wrap gap-4">
              {PLAN_OPTIONS.map((o) => (
                <label key={o.value} className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.allowed_plans.includes(o.value)}
                    onChange={() => togglePlan(o.value)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-slate-700">{o.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="edit_show_on_landing"
            checked={form.show_on_landing}
            onChange={(e) => setForm((p) => ({ ...p, show_on_landing: e.target.checked }))}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="edit_show_on_landing" className="text-sm font-medium text-slate-700">
            Show on landing page
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {message.text && (
          <p className={message.type === 'error' ? 'text-red-600 text-sm' : 'text-emerald-600 text-sm'}>
            {message.text}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="nth-btn-primary px-4 py-2 font-medium disabled:opacity-50 disabled:transform-none"
        >
          {submitting ? <ButtonLoader label="Saving…" /> : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
