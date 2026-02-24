import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiXMark } from 'react-icons/hi2';
import { supabase } from '../../lib/supabase';

const TRACKS = [
  { value: 'fresher', label: 'Fresher' },
  { value: 'experienced', label: 'Experienced' },
];
const PLANS = [
  { value: 'base', label: 'Base' },
  { value: 'silver', label: 'Silver' },
  { value: 'gold', label: 'Gold' },
];

const emptyForm = {
  full_name: '',
  email: '',
  password: '',
  track: 'fresher',
  plan: 'base',
  phone: '',
  city: '',
};

export default function CreateAspirantModal({ onClose, onSuccess, initialValues }) {
  const [form, setForm] = useState(() => ({ ...emptyForm, ...initialValues }));
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialValues) setForm((f) => ({ ...f, ...initialValues }));
  }, [initialValues]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    if (!form.full_name?.trim() || !form.email?.trim() || !form.password) {
      setMessage({ type: 'error', text: 'Name, email, and password are required.' });
      return;
    }
    if (form.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    setSubmitting(true);
    const { data: sessionData } = await supabase.auth.getSession();
    let token = sessionData?.session?.access_token;
    if (!token) {
      const { data: refreshData } = await supabase.auth.refreshSession();
      token = refreshData?.session?.access_token;
    }
    if (!token) {
      setSubmitting(false);
      setMessage({ type: 'error', text: 'Session expired. Please sign out and sign in again.' });
      return;
    }
    const { data, error } = await supabase.functions.invoke('create-aspirant', {
      body: {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        track: form.track || 'fresher',
        plan: form.plan || 'base',
        phone: form.phone?.trim() || null,
        city: form.city?.trim() || null,
      },
      headers: { Authorization: `Bearer ${token}` },
    });
    setSubmitting(false);

    // Prefer server error message (e.g. "email already registered"); then network/JWT errors
    const serverError = data?.error != null ? String(data.error) : null;
    const clientError = error?.message;
    const msg = serverError || clientError || 'Failed to create aspirant.';
    const displayMsg = msg === 'Invalid JWT' ? 'Session expired. Please sign out and sign in again.' : msg;

    if (serverError || error) {
      setMessage({ type: 'error', text: displayMsg });
      return;
    }
    onSuccess?.();
    onClose?.();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white border border-slate-200 shadow-xl"
        >
          <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
            <h2 className="text-lg font-semibold text-slate-900">Create Aspirant</h2>
            <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close">
              <HiXMark className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {message.text && (
              <p className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message.text}</p>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full name *</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Full name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="user@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Min 6 characters (share with user)"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Track</label>
              <select
                value={form.track}
                onChange={(e) => setForm((f) => ({ ...f, track: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {TRACKS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Plan</label>
              <select
                value={form.plan}
                onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {PLANS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone (optional)</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Contact number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City (optional)</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="City"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-3 py-2 text-sm font-medium text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Creating…' : 'Create Aspirant'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
