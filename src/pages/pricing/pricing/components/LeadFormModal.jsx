import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiXMark } from 'react-icons/hi2';
import { supabase } from '../../../../lib/supabase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value) {
  const v = (value || '').trim();
  return v.length > 0 && EMAIL_REGEX.test(v);
}

function isValidMobile(value) {
  const digits = (value || '').replace(/\D/g, '');
  return digits.length === 10 && /^[6-9]/.test(digits);
}

const REGISTRATION_CLOSED_MESSAGE = 'Registrations are closed for today. Please try again after 24 hours.';

export default function LeadFormModal({ plan, track, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: '',
    looking_for_role: '',
    email: '',
    contact_number: '',
    graduation_pass: '',
    current_company: '',
    experience_years: '',
    current_ctc: '',
    message: '',
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    email: '',
    contact_number: '',
    looking_for_role: '',
    graduation_pass: '',
    current_company: '',
    experience_years: '',
    current_ctc: '',
  });
  const [registrationAllowed, setRegistrationAllowed] = useState(null);
  const [limitMessage, setLimitMessage] = useState('');

  const isExperienced = track === 'experienced';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('can_accept_registration_today');
      if (cancelled) return;
      if (error) {
        console.warn('can_accept_registration_today failed:', error);
        setRegistrationAllowed(true);
        return;
      }
      if (data && typeof data.allowed === 'boolean') {
        setRegistrationAllowed(data.allowed);
        setLimitMessage(data.message || REGISTRATION_CLOSED_MESSAGE);
      } else {
        setRegistrationAllowed(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleContactChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm((f) => ({ ...f, contact_number: v }));
    clearFieldError('contact_number');
  };

  const handleEmailChange = (e) => {
    setForm((f) => ({ ...f, email: e.target.value }));
    clearFieldError('email');
  };

  const clearFieldError = (field) => {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setFieldErrors({
      name: '',
      email: '',
      contact_number: '',
      looking_for_role: '',
      graduation_pass: '',
      current_company: '',
      experience_years: '',
      current_ctc: '',
    });

    const { data: limitData } = await supabase.rpc('can_accept_registration_today');
    if (limitData && !limitData.allowed) {
      setMessage({ type: 'error', text: limitData.message || REGISTRATION_CLOSED_MESSAGE });
      return;
    }

    const nameTrim = form.name?.trim() ?? '';
    const emailTrim = form.email?.trim() ?? '';
    const contactTrim = form.contact_number?.trim() ?? '';
    const lookingForRoleTrim = form.looking_for_role?.trim() ?? '';
    const graduationPassTrim = form.graduation_pass?.trim() ?? '';

    if (!nameTrim) {
      setFieldErrors((err) => ({ ...err, name: 'Name is required.' }));
      return;
    }
    if (!emailTrim) {
      setFieldErrors((err) => ({ ...err, email: 'Email is required.' }));
      return;
    }
    if (!isValidEmail(emailTrim)) {
      setFieldErrors((err) => ({ ...err, email: 'Please enter a valid email address.' }));
      return;
    }
    if (!contactTrim) {
      setFieldErrors((err) => ({ ...err, contact_number: 'Contact number is required.' }));
      return;
    }
    if (!isValidMobile(contactTrim)) {
      setFieldErrors((err) => ({
        ...err,
        contact_number: 'Please enter a valid 10-digit mobile number (starting with 6–9).',
      }));
      return;
    }
    if (!lookingForRoleTrim) {
      setFieldErrors((err) => ({ ...err, looking_for_role: 'Please specify the role you are looking for.' }));
      return;
    }
    if (!graduationPassTrim) {
      setFieldErrors((err) => ({ ...err, graduation_pass: 'Graduation pass year is required.' }));
      return;
    }
    if (isExperienced) {
      const companyTrim = form.current_company?.trim() ?? '';
      const expTrim = form.experience_years?.trim() ?? '';
      const ctcTrim = form.current_ctc?.trim() ?? '';
      if (!companyTrim) {
        setFieldErrors((err) => ({ ...err, current_company: 'Current company is required.' }));
        return;
      }
      if (!expTrim) {
        setFieldErrors((err) => ({ ...err, experience_years: 'Years of experience is required.' }));
        return;
      }
      if (!ctcTrim) {
        setFieldErrors((err) => ({ ...err, current_ctc: 'Current CTC is required.' }));
        return;
      }
    }

    setSubmitting(true);
    const { data } = await supabase.rpc('submit_pricing_lead', {
      p_plan_id: plan?.id ?? '',
      p_track: track ?? 'fresher',
      p_name: nameTrim,
      p_looking_for_role: lookingForRoleTrim,
      p_email: emailTrim,
      p_contact_number: contactTrim.replace(/\D/g, ''),
      p_graduation_pass: graduationPassTrim,
      p_current_company: isExperienced ? (form.current_company.trim() || null) : null,
      p_experience_years: isExperienced ? (form.experience_years.trim() || null) : null,
      p_current_ctc: isExperienced ? (form.current_ctc.trim() || null) : null,
      p_message: form.message.trim() || null,
    });
    setSubmitting(false);
    if (data?.ok) {
      onSuccess?.();
      onClose?.();
    } else {
      setMessage({ type: 'error', text: data?.error ?? 'Something went wrong. Please try again.' });
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-white/10 shadow-xl overflow-hidden"
        >
          {/* Fixed header: logo left, title centered, close right */}
          <div className="relative flex-shrink-0 flex items-center justify-between gap-3 px-4 sm:px-5 py-4 sm:py-5 border-b border-white/10">
            <img
              src="/lilogo.png"
              alt="NTH"
              className="h-7 w-auto object-contain shrink-0 sm:h-8"
            />
            <h2 className="absolute left-1/2 -translate-x-1/2 text-lg sm:text-xl font-semibold text-white tracking-tight whitespace-nowrap">
              Enroll in {plan?.name ?? 'Plan'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 touch-manipulation transition-colors"
              aria-label="Close"
            >
              <HiXMark className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
          {/* Scrollable form body */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            {registrationAllowed === false ? (
              <div className="p-4 sm:p-5 space-y-4">
                <p className="text-slate-200 text-center py-6">
                  {limitMessage}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 sm:py-2.5 rounded-xl font-semibold text-white text-sm sm:text-base touch-manipulation"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--nth-primary)) 0%, hsl(var(--nth-primary-light)) 100%)',
                  }}
                >
                  OK
                </button>
              </div>
            ) : registrationAllowed === null ? (
              <div className="p-4 sm:p-5 py-12 text-center text-slate-400 text-sm">
                Checking…
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 pb-2">
            {/* 1. Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                  clearFieldError('name');
                }}
                required
                className={`w-full px-4 py-3 sm:py-2.5 rounded-xl bg-white/5 border text-white placeholder-slate-500 focus:ring-2 focus:ring-[hsl(var(--nth-primary))] focus:border-transparent text-base min-h-[44px] sm:min-h-0 ${
                  fieldErrors.name ? 'border-red-400/60' : 'border-white/10'
                }`}
                placeholder="Your name"
              />
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.name}</p>
              )}
            </div>
            {/* 2. Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={handleEmailChange}
                required
                autoComplete="email"
                className={`w-full px-4 py-3 sm:py-2.5 rounded-xl bg-white/5 border text-white placeholder-slate-500 focus:ring-2 focus:ring-[hsl(var(--nth-primary))] focus:border-transparent text-base min-h-[44px] sm:min-h-0 ${
                  fieldErrors.email ? 'border-red-400/60' : 'border-white/10'
                }`}
                placeholder="you@example.com"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.email}</p>
              )}
            </div>
            {/* 3. Contact number */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Contact number *</label>
              <input
                type="tel"
                inputMode="numeric"
                value={form.contact_number}
                onChange={handleContactChange}
                required
                maxLength={10}
                autoComplete="tel"
                className={`w-full px-4 py-3 sm:py-2.5 rounded-xl bg-white/5 border text-white placeholder-slate-500 focus:ring-2 focus:ring-[hsl(var(--nth-primary))] focus:border-transparent text-base min-h-[44px] sm:min-h-0 ${
                  fieldErrors.contact_number ? 'border-red-400/60' : 'border-white/10'
                }`}
                placeholder="10-digit mobile (e.g. 9876543210)"
              />
              {fieldErrors.contact_number && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.contact_number}</p>
              )}
            </div>
            {/* 4. Looking for role */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Looking for which role? *</label>
              <input
                type="text"
                value={form.looking_for_role}
                onChange={(e) => {
                  setForm((f) => ({ ...f, looking_for_role: e.target.value }));
                  clearFieldError('looking_for_role');
                }}
                required
                className={`w-full px-4 py-3 sm:py-2.5 rounded-xl bg-white/5 border text-white placeholder-slate-500 focus:ring-2 focus:ring-[hsl(var(--nth-primary))] focus:border-transparent text-base min-h-[44px] sm:min-h-0 ${
                  fieldErrors.looking_for_role ? 'border-red-400/60' : 'border-white/10'
                }`}
                placeholder="e.g. Frontend Developer, Data Analyst"
              />
              {fieldErrors.looking_for_role && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.looking_for_role}</p>
              )}
            </div>
            {/* 5. Graduation pass */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Graduation pass (year) *</label>
              <input
                type="text"
                value={form.graduation_pass}
                onChange={(e) => {
                  setForm((f) => ({ ...f, graduation_pass: e.target.value }));
                  clearFieldError('graduation_pass');
                }}
                required
                    className={`w-full px-4 py-3 sm:py-2.5 rounded-xl bg-white/5 border text-white placeholder-slate-500 focus:ring-2 focus:ring-[hsl(var(--nth-primary))] focus:border-transparent text-base min-h-[44px] sm:min-h-0 ${
                  fieldErrors.graduation_pass ? 'border-red-400/60' : 'border-white/10'
                }`}
                placeholder="e.g. 2023"
              />
              {fieldErrors.graduation_pass && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.graduation_pass}</p>
              )}
            </div>
            {isExperienced && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Current company *</label>
                  <input
                    type="text"
                    value={form.current_company}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, current_company: e.target.value }));
                      clearFieldError('current_company');
                    }}
                    required
                    className={`w-full px-4 py-3 sm:py-2.5 rounded-xl bg-white/5 border text-white placeholder-slate-500 focus:ring-2 focus:ring-[hsl(var(--nth-primary))] focus:border-transparent text-base min-h-[44px] sm:min-h-0 ${
                      fieldErrors.current_company ? 'border-red-400/60' : 'border-white/10'
                    }`}
                    placeholder="Company name"
                  />
                  {fieldErrors.current_company && (
                    <p className="mt-1 text-xs text-red-400">{fieldErrors.current_company}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Years of experience *</label>
                  <input
                    type="text"
                    value={form.experience_years}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, experience_years: e.target.value }));
                      clearFieldError('experience_years');
                    }}
                    required
                    className={`w-full px-4 py-3 sm:py-2.5 rounded-xl bg-white/5 border text-white placeholder-slate-500 focus:ring-2 focus:ring-[hsl(var(--nth-primary))] focus:border-transparent text-base min-h-[44px] sm:min-h-0 ${
                      fieldErrors.experience_years ? 'border-red-400/60' : 'border-white/10'
                    }`}
                    placeholder="e.g. 3"
                  />
                  {fieldErrors.experience_years && (
                    <p className="mt-1 text-xs text-red-400">{fieldErrors.experience_years}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Current CTC *</label>
                  <input
                    type="text"
                    value={form.current_ctc}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, current_ctc: e.target.value }));
                      clearFieldError('current_ctc');
                    }}
                    required
                    className={`w-full px-4 py-3 sm:py-2.5 rounded-xl bg-white/5 border text-white placeholder-slate-500 focus:ring-2 focus:ring-[hsl(var(--nth-primary))] focus:border-transparent text-base min-h-[44px] sm:min-h-0 ${
                      fieldErrors.current_ctc ? 'border-red-400/60' : 'border-white/10'
                    }`}
                    placeholder="e.g. 8 LPA"
                  />
                  {fieldErrors.current_ctc && (
                    <p className="mt-1 text-xs text-red-400">{fieldErrors.current_ctc}</p>
                  )}
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Anything you’d like to say?</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 sm:py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:ring-2 focus:ring-[hsl(var(--nth-primary))] focus:border-transparent resize-none text-base min-h-[80px] sm:min-h-0"
                placeholder="Optional message…"
              />
            </div>
            {message.text && (
              <p className={`text-sm ${message.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                {message.text}
              </p>
            )}
            <div className="flex gap-3 pt-2 pb-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 sm:py-2.5 rounded-xl border border-white/20 text-slate-300 hover:bg-white/5 text-sm sm:text-base font-medium touch-manipulation"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 sm:py-2.5 rounded-xl font-semibold text-white disabled:opacity-60 text-sm sm:text-base touch-manipulation"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--nth-primary)) 0%, hsl(var(--nth-primary-light)) 100%)',
                }}
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
            </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
