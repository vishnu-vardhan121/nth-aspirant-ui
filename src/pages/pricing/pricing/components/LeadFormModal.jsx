import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiXMark } from 'react-icons/hi2';
import { supabase } from '../../../../lib/supabase';

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

  const isExperienced = track === 'experienced';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    if (!form.email?.trim() || !form.contact_number?.trim()) {
      setMessage({ type: 'error', text: 'Email and contact number are required.' });
      return;
    }
    setSubmitting(true);
    const { data } = await supabase.rpc('submit_pricing_lead', {
      p_plan_id: plan?.id ?? '',
      p_track: track ?? 'fresher',
      p_name: form.name.trim() || null,
      p_looking_for_role: form.looking_for_role.trim() || null,
      p_email: form.email.trim(),
      p_contact_number: form.contact_number.trim(),
      p_graduation_pass: form.graduation_pass.trim() || null,
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
          {/* Fixed header with logo */}
          <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-white/10">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/lilogo.png"
                alt="NTH"
                className="h-8 w-auto object-contain flex-shrink-0 sm:h-9"
              />
              <h2 className="text-base sm:text-lg font-semibold text-white truncate">
                Enroll in {plan?.name ?? 'Plan'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 touch-manipulation"
              aria-label="Close"
            >
              <HiXMark className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
          {/* Scrollable form body */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 pb-2">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-3 sm:py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:ring-2 focus:ring-[rgb(var(--nth-primary))] focus:border-transparent text-base min-h-[44px] sm:min-h-0"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Looking for which role?</label>
              <input
                type="text"
                value={form.looking_for_role}
                onChange={(e) => setForm((f) => ({ ...f, looking_for_role: e.target.value }))}
                className="w-full px-4 py-3 sm:py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:ring-2 focus:ring-[rgb(var(--nth-primary))] focus:border-transparent text-base min-h-[44px] sm:min-h-0"
                placeholder="e.g. Frontend Developer, Data Analyst"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                className="w-full px-4 py-3 sm:py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:ring-2 focus:ring-[rgb(var(--nth-primary))] focus:border-transparent text-base min-h-[44px] sm:min-h-0"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Contact number *</label>
              <input
                type="tel"
                value={form.contact_number}
                onChange={(e) => setForm((f) => ({ ...f, contact_number: e.target.value }))}
                required
                className="w-full px-4 py-3 sm:py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:ring-2 focus:ring-[rgb(var(--nth-primary))] focus:border-transparent text-base min-h-[44px] sm:min-h-0"
                placeholder="10-digit mobile number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Graduation pass (year)</label>
              <input
                type="text"
                value={form.graduation_pass}
                onChange={(e) => setForm((f) => ({ ...f, graduation_pass: e.target.value }))}
                className="w-full px-4 py-3 sm:py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:ring-2 focus:ring-[rgb(var(--nth-primary))] focus:border-transparent text-base min-h-[44px] sm:min-h-0"
                placeholder="e.g. 2023"
              />
            </div>
            {isExperienced && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Current company</label>
                  <input
                    type="text"
                    value={form.current_company}
                    onChange={(e) => setForm((f) => ({ ...f, current_company: e.target.value }))}
                    className="w-full px-4 py-3 sm:py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:ring-2 focus:ring-[rgb(var(--nth-primary))] focus:border-transparent text-base min-h-[44px] sm:min-h-0"
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Years of experience</label>
                  <input
                    type="text"
                    value={form.experience_years}
                    onChange={(e) => setForm((f) => ({ ...f, experience_years: e.target.value }))}
                    className="w-full px-4 py-3 sm:py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:ring-2 focus:ring-[rgb(var(--nth-primary))] focus:border-transparent text-base min-h-[44px] sm:min-h-0"
                    placeholder="e.g. 3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Current CTC</label>
                  <input
                    type="text"
                    value={form.current_ctc}
                    onChange={(e) => setForm((f) => ({ ...f, current_ctc: e.target.value }))}
                    className="w-full px-4 py-3 sm:py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:ring-2 focus:ring-[rgb(var(--nth-primary))] focus:border-transparent text-base min-h-[44px] sm:min-h-0"
                    placeholder="e.g. 8 LPA"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Anything you’d like to say?</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 sm:py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:ring-2 focus:ring-[rgb(var(--nth-primary))] focus:border-transparent resize-none text-base min-h-[80px] sm:min-h-0"
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
                  background: 'linear-gradient(135deg, rgb(var(--nth-primary)) 0%, rgb(var(--nth-primary-light)) 100%)',
                }}
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
