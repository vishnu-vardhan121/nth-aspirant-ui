import { useEffect, useState } from 'react';
import { HiXMark } from 'react-icons/hi2';
import { supabase } from '../../../../lib/supabase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;

const ISSUE_TYPES = [
  { value: 'general', label: 'General question' },
  { value: 'account', label: 'Dashboard / login / account' },
  { value: 'technical', label: 'Website or technical issue' },
  { value: 'jobs', label: 'Jobs or applications' },
  { value: 'mocks', label: 'Mock interviews or scheduling' },
  { value: 'payment', label: 'Billing or payment' },
  { value: 'ads', label: 'Advertising or sponsorship' },
  { value: 'other', label: 'Something else' },
];

const INITIAL_FORM = {
  name: '',
  phone: '',
  email: '',
  issueType: 'general',
  message: '',
};

export default function HelpDeskModal({ open, onClose }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const validateField = (field, value) => {
    const trimmed = (value ?? '').trim();
    if (field === 'name') {
      return trimmed.length < 2 ? 'Name is required (min 2 characters).' : '';
    }
    if (field === 'phone') {
      if (!trimmed) return 'Phone number is required.';
      return PHONE_REGEX.test(trimmed) ? '' : 'Enter a valid 10-digit Indian mobile number (starts with 6-9).';
    }
    if (field === 'email') {
      if (!trimmed) return 'Email is required.';
      return EMAIL_REGEX.test(trimmed) ? '' : 'Enter a valid email address.';
    }
    if (field === 'issueType') {
      return trimmed ? '' : 'Please choose an issue type.';
    }
    if (field === 'message') {
      return trimmed.length < 10 ? 'Issue details should be at least 10 characters.' : '';
    }
    return '';
  };

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const validate = () => {
    const nextErrors = {};
    const fields = ['name', 'phone', 'email', 'issueType', 'message'];
    fields.forEach((field) => {
      const error = validateField(field, form[field]);
      if (error) nextErrors[field] = error;
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const normalizePhone = (value) => {
    const digitsOnly = value.replace(/\D/g, '');
    return digitsOnly.slice(0, 10);
  };

  const handleChange = (field, value) => {
    const nextValue = field === 'phone' ? normalizePhone(value) : value;
    setForm((prev) => ({ ...prev, [field]: nextValue }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
    if (submitError) setSubmitError('');
  };

  const resetAndClose = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setSubmitError('');
    setSubmitting(false);
    onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;

    setSubmitting(true);
    const { data, error } = await supabase.rpc('submit_help_request', {
      p_name: form.name.trim(),
      p_phone: form.phone.trim(),
      p_email: form.email.trim().toLowerCase(),
      p_issue_type: form.issueType,
      p_message: form.message.trim(),
      p_source: 'landing_page',
    });
    setSubmitting(false);

    if (error || !data?.ok) {
      setSubmitError(data?.error || error?.message || 'Failed to submit your issue. Please try again.');
      return;
    }

    resetAndClose();
  };

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-md" onClick={resetAndClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 text-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Help Desk</h2>
            <p className="mt-1 text-sm text-slate-300">Share your issue. Our team will contact you.</p>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close help desk"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm outline-none ring-indigo-500/60 placeholder:text-slate-400 focus:ring-2"
              placeholder="Enter your name"
              maxLength={80}
              required
            />
            {errors.name && <p className="mt-1 text-xs text-red-300">{errors.name}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">Phone *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm outline-none ring-indigo-500/60 placeholder:text-slate-400 focus:ring-2"
                placeholder="9876543210"
                inputMode="numeric"
                maxLength={10}
                required
              />
              {errors.phone && <p className="mt-1 text-xs text-red-300">{errors.phone}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm outline-none ring-indigo-500/60 placeholder:text-slate-400 focus:ring-2"
                placeholder="you@domain.com"
                maxLength={120}
                required
              />
              {errors.email && <p className="mt-1 text-xs text-red-300">{errors.email}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">Issue type *</label>
            <select
              value={form.issueType}
              onChange={(e) => handleChange('issueType', e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm outline-none ring-indigo-500/60 focus:ring-2"
              required
            >
              {ISSUE_TYPES.map((type) => (
                <option key={type.value} value={type.value} className="text-slate-900">
                  {type.label}
                </option>
              ))}
            </select>
            {errors.issueType && <p className="mt-1 text-xs text-red-300">{errors.issueType}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">Issue details *</label>
            <textarea
              rows={4}
              value={form.message}
              onChange={(e) => handleChange('message', e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm outline-none ring-indigo-500/60 placeholder:text-slate-400 focus:ring-2"
              placeholder="Describe your issue..."
              maxLength={1000}
              required
            />
            {errors.message && <p className="mt-1 text-xs text-red-300">{errors.message}</p>}
          </div>

          {submitError && <p className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{submitError}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={resetAndClose}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
