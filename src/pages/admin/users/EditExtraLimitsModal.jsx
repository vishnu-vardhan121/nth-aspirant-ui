import { useState } from 'react';
import { HiXMark } from 'react-icons/hi2';
import { supabase } from '../../../lib/supabase';
import { AspirantNameWithPhone } from './AspirantIdentity';

export default function EditExtraLimitsModal({ user, onClose, onSuccess }) {
  const [extraMock, setExtraMock] = useState(user?.extra_mock_limit ?? 0);
  const [extraInterview, setExtraInterview] = useState(user?.extra_interview_limit ?? 0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { data, error } = await supabase.rpc('admin_set_aspirant_extra_limits', {
      p_aspirant_id: user.id,
      p_extra_mock_limit: Math.max(0, parseInt(extraMock, 10) || 0),
      p_extra_interview_limit: Math.max(0, parseInt(extraInterview, 10) || 0),
    });
    setSubmitting(false);
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (error || !result?.ok) {
      setError(result?.error || error?.message || 'Failed to update.');
      return;
    }
    onSuccess?.();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white border border-slate-200 shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">Extra limits</h2>
            <AspirantNameWithPhone name={user.full_name} phone={user.phone} email={user.email} className="mt-1" />
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close">
            <HiXMark className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-600 mb-4">Grant extra mock or interview chances beyond plan limits.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Extra mocks</label>
            <input type="number" min={0} value={extraMock} onChange={(e) => setExtraMock(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Extra interviews</label>
            <input type="number" min={0} value={extraInterview} onChange={(e) => setExtraInterview(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" />
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
