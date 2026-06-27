import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiXMark } from 'react-icons/hi2';
import { supabase } from '../../../../lib/supabase';
import { useModalBackdropClose } from '../../../../hooks/useModalBackdropClose';
import { clearFormDraft, loadFormDraft, saveFormDraft } from '../../../../lib/formDraft';

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
  const { backdropProps } = useModalBackdropClose(onClose);
  const draftKey = `nth-lead:${plan?.planId ?? 'plan'}:${track ?? 'track'}`;
  const [form, setForm] = useState(() => {
    const draft = loadFormDraft(draftKey);
    return draft && typeof draft === 'object'
      ? {
          name: '',
          looking_for_role: '',
          email: '',
          contact_number: '',
          graduation_pass: '',
          current_company: '',
          experience_years: '',
          current_ctc: '',
          message: '',
          ...draft,
        }
      : {
          name: '',
          looking_for_role: '',
          email: '',
          contact_number: '',
          graduation_pass: '',
          current_company: '',
          experience_years: '',
          current_ctc: '',
          message: '',
        };
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

  useEffect(() => {
    saveFormDraft(draftKey, form);
  }, [draftKey, form]);
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
      clearFormDraft(draftKey);
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
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm"
        {...backdropProps}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] flex flex-col bg-slate-900 border border-white/10 shadow-2xl rounded-2xl relative overflow-hidden"
        >
          {/* Header Block */}
          <div className="relative flex-shrink-0 flex items-center justify-between gap-3 px-6 py-6 border-b border-white/10 bg-white/5">
             <div className="flex flex-col gap-1">
               <h2 className="text-xl font-bold text-white tracking-tight">
                 Enroll in {plan?.name ?? 'Plan'}
               </h2>
             </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors border border-white/10 shadow-xs"
              aria-label="Close"
            >
              <HiXMark className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Form Content Area */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-6 custom-scrollbar">
            {registrationAllowed === false ? (
              <div className="py-12 space-y-6 text-center">
                <div className="inline-block p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
                  <p className="text-red-400 text-sm font-medium tracking-wide">
                    {limitMessage}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-4 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-400 transition-colors shadow-lg shadow-indigo-500/20"
                >
                  Confirm
                </button>
              </div>
            ) : registrationAllowed === null ? (
              <div className="py-20 text-center flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="font-mono text-[10px] text-slate-500 uppercase tracking-[0.3em]">Querying Database…</span>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Field Groups */}
              {[
                { label: 'Name', name: 'name', type: 'text', placeholder: 'Enter your name' },
                { label: 'Email', name: 'email', type: 'email', placeholder: 'you@domain.com' },
                { label: 'Contact Number', name: 'contact_number', type: 'tel', placeholder: '10-digit mobile number', maxLength: 10 },
                { label: 'Role Target', name: 'looking_for_role', type: 'text', placeholder: 'Which role are you targeting?' },
                { label: 'Graduation Year', name: 'graduation_pass', type: 'text', placeholder: 'e.g., 2024' },
              ].map((field) => (
                <div key={field.name} className="relative">
                  <label className="block text-sm font-semibold text-slate-300 mb-2">{field.label} <span className="text-indigo-400">*</span></label>
                  <input
                    type={field.type}
                    value={form[field.name]}
                    onChange={(e) => {
                      if (field.name === 'contact_number') handleContactChange(e);
                      else {
                        setForm((f) => ({ ...f, [field.name]: e.target.value }));
                        clearFieldError(field.name);
                      }
                    }}
                    required
                    maxLength={field.maxLength}
                    className={`w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:bg-white/10 focus:border-indigo-500 transition-all ${
                      fieldErrors[field.name] ? 'border-red-400/60' : ''
                    }`}
                    placeholder={field.placeholder}
                  />
                  {fieldErrors[field.name] && (
                    <p className="mt-1 text-xs text-red-400 font-medium">{fieldErrors[field.name]}</p>
                  )}
                </div>
              ))}

              {isExperienced && (
                <div className="pt-4 space-y-6 border-t border-white/10">
                  <span className="block text-sm font-bold text-indigo-400 uppercase tracking-widest mb-4">Professional Information</span>
                  {[
                    { label: 'Current Company', name: 'current_company', placeholder: 'Where do you work now?' },
                    { label: 'Years of Experience', name: 'experience_years', placeholder: 'e.g., 2.5' },
                    { label: 'Current CTC', name: 'current_ctc', placeholder: 'Current compensation' },
                  ].map((field) => (
                    <div key={field.name}>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">{field.label} <span className="text-indigo-400">*</span></label>
                      <input
                        type="text"
                        value={form[field.name]}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, [field.name]: e.target.value }));
                          clearFieldError(field.name);
                        }}
                        required
                        className={`w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:bg-white/10 focus:border-indigo-500 transition-all ${
                          fieldErrors[field.name] ? 'border-red-400/60' : ''
                        }`}
                        placeholder={field.placeholder}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Additional Comments (Optional)</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:bg-white/10 focus:border-indigo-500 transition-all resize-none"
                  placeholder="Anything else we should know?"
                />
              </div>

              {message.text && (
                <div className={`p-4 rounded-xl border ${message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'} text-xs font-medium`}>
                  {message.text}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 pt-6 pb-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3.5 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3.5 bg-indigo-500 text-white font-semibold rounded-xl hover:bg-indigo-400 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20"
                >
                  {submitting ? 'Submitting...' : 'Submit Form'}
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
