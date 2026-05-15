import { useState } from 'react';
import { supabase } from '../../../../lib/supabase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;

export const HELP_DESK_ISSUE_TYPES = [
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

const VARIANT_STYLES = {
  dark: {
    label: 'text-slate-200',
    input:
      'rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none ring-indigo-500/60 placeholder:text-slate-400 focus:ring-2',
    select:
      'rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none ring-indigo-500/60 focus:ring-2',
    option: 'text-slate-900',
    error: 'text-red-300',
    submitError: 'rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200',
    cancelBtn:
      'rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10',
    submitBtn:
      'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60',
    successWrap:
      'rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-6 sm:p-8',
    successTitle: 'text-emerald-300',
    successBody: 'text-slate-300',
    successBtn: 'text-indigo-300 hover:text-indigo-200',
  },
  light: {
    label: 'text-slate-800',
    input:
      'rounded-xl border border-slate-300/90 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-900/5 outline-none ring-indigo-500/40 placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20',
    select:
      'rounded-xl border border-slate-300/90 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-900/5 outline-none ring-indigo-500/40 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20',
    option: 'text-slate-900',
    error: 'text-red-600',
    submitError: 'rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700',
    cancelBtn:
      'rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50',
    submitBtn:
      'rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60',
    successWrap:
      'rounded-2xl border border-emerald-200/90 bg-linear-to-br from-emerald-50/90 via-white to-teal-50/50 p-6 sm:p-8',
    successTitle: 'text-emerald-700',
    successBody: 'text-slate-600',
    successBtn: 'text-indigo-600 hover:text-indigo-700',
  },
};

export default function HelpDeskForm({
  variant = 'dark',
  source = 'landing_page',
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  showCancel = false,
  onCancel,
  onSuccess,
  successDisplay = 'inline',
  className = '',
  idPrefix = 'help-desk',
}) {
  const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.dark;
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

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

  const validate = () => {
    const nextErrors = {};
    ['name', 'phone', 'email', 'issueType', 'message'].forEach((field) => {
      const error = validateField(field, form[field]);
      if (error) nextErrors[field] = error;
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const normalizePhone = (value) => value.replace(/\D/g, '').slice(0, 10);

  const handleChange = (field, value) => {
    const nextValue = field === 'phone' ? normalizePhone(value) : value;
    setForm((prev) => ({ ...prev, [field]: nextValue }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    if (submitError) setSubmitError('');
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setSubmitError('');
    setSubmitting(false);
    setSubmitted(false);
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
      p_source: source,
    });
    setSubmitting(false);

    if (error || !data?.ok) {
      setSubmitError(data?.error || error?.message || 'Failed to submit your message. Please try again.');
      return;
    }

    if (successDisplay === 'none') {
      resetForm();
      onSuccess?.(data);
      return;
    }

    setSubmitted(true);
    setForm(INITIAL_FORM);
    onSuccess?.(data);
  };

  if (submitted) {
    return (
      <div className={`${styles.successWrap} ${className}`} role="status">
        <p className={`text-sm font-bold uppercase tracking-[0.1em] ${styles.successTitle}`}>Message received</p>
        <p className="mt-2 text-base font-semibold text-slate-900">Thank you for reaching out.</p>
        <p className={`mt-2 text-sm leading-relaxed ${styles.successBody}`}>
          Our team will review your enquiry and respond using the contact details you provided.
        </p>
        <button
          type="button"
          onClick={resetForm}
          className={`mt-5 text-sm font-semibold underline-offset-2 hover:underline ${styles.successBtn}`}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`} noValidate>
      <div>
        <label htmlFor={`${idPrefix}-name`} className={`mb-1 block text-sm font-medium ${styles.label}`}>
          Name *
        </label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          value={form.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className={`w-full ${styles.input}`}
          placeholder="Your full name"
          maxLength={80}
          autoComplete="name"
          required
        />
        {errors.name ? <p className={`mt-1 text-xs ${styles.error}`}>{errors.name}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-phone`} className={`mb-1 block text-sm font-medium ${styles.label}`}>
            Phone *
          </label>
          <input
            id={`${idPrefix}-phone`}
            type="tel"
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className={`w-full ${styles.input}`}
            placeholder="9876543210"
            inputMode="numeric"
            maxLength={10}
            autoComplete="tel"
            required
          />
          {errors.phone ? <p className={`mt-1 text-xs ${styles.error}`}>{errors.phone}</p> : null}
        </div>
        <div>
          <label htmlFor={`${idPrefix}-email`} className={`mb-1 block text-sm font-medium ${styles.label}`}>
            Email *
          </label>
          <input
            id={`${idPrefix}-email`}
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className={`w-full ${styles.input}`}
            placeholder="you@domain.com"
            maxLength={120}
            autoComplete="email"
            required
          />
          {errors.email ? <p className={`mt-1 text-xs ${styles.error}`}>{errors.email}</p> : null}
        </div>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-issue`} className={`mb-1 block text-sm font-medium ${styles.label}`}>
          Topic *
        </label>
        <select
          id={`${idPrefix}-issue`}
          value={form.issueType}
          onChange={(e) => handleChange('issueType', e.target.value)}
          className={`w-full ${styles.select}`}
          required
        >
          {HELP_DESK_ISSUE_TYPES.map((type) => (
            <option key={type.value} value={type.value} className={styles.option}>
              {type.label}
            </option>
          ))}
        </select>
        {errors.issueType ? <p className={`mt-1 text-xs ${styles.error}`}>{errors.issueType}</p> : null}
      </div>

      <div>
        <label htmlFor={`${idPrefix}-message`} className={`mb-1 block text-sm font-medium ${styles.label}`}>
          Message *
        </label>
        <textarea
          id={`${idPrefix}-message`}
          rows={4}
          value={form.message}
          onChange={(e) => handleChange('message', e.target.value)}
          className={`w-full ${styles.input}`}
          placeholder="How can we help?"
          maxLength={1000}
          required
        />
        {errors.message ? <p className={`mt-1 text-xs ${styles.error}`}>{errors.message}</p> : null}
      </div>

      {submitError ? <p className={styles.submitError}>{submitError}</p> : null}

      <div className={`flex flex-wrap items-center gap-2 pt-1 ${showCancel ? 'justify-end' : ''}`}>
        {showCancel ? (
          <button type="button" onClick={onCancel} className={styles.cancelBtn}>
            {cancelLabel}
          </button>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className={`${styles.submitBtn} ${showCancel ? '' : 'w-full sm:w-auto'}`}
        >
          {submitting ? 'Submitting…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
