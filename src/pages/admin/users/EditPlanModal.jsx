import { useState } from 'react';
import { HiXMark } from 'react-icons/hi2';
import { supabase } from '../../../lib/supabase';
import { PLANS } from './constants';

export default function EditPlanModal({ user, onClose, onSuccess }) {
  const [plan, setPlan] = useState(user?.plan || 'base');
  const [planStartedAt, setPlanStartedAt] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const startedAt = planStartedAt.trim() ? new Date(planStartedAt).toISOString() : null;
    const { data, error } = await supabase.rpc('admin_set_aspirant_plan', {
      p_aspirant_id: user.id,
      p_plan: plan,
      p_plan_started_at: startedAt,
    });
    setSubmitting(false);
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (error || !result?.ok) {
      setError(result?.error || error?.message || 'Failed to update plan.');
      return;
    }
    onSuccess?.();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white border border-slate-200 shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Edit plan — {user.full_name ?? user.email}</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close">
            <HiXMark className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Plan</label>
            <select value={plan} onChange={(e) => setPlan(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
              {PLANS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Plan start date (optional)</label>
            <input type="date" value={planStartedAt} onChange={(e) => setPlanStartedAt(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <p className="text-xs text-slate-500 mt-1">Leave empty to keep current start date.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
