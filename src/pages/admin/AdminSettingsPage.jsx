import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PageLoader, ButtonLoader } from '../../components/ui/Loader';

export default function AdminSettingsPage() {
  const [limit, setLimit] = useState('');
  const [countToday, setCountToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [mockLimits, setMockLimits] = useState({ base: '', silver: '', gold: '' });
  const [mockLimitsSaving, setMockLimitsSaving] = useState(false);
  const [mockLimitsMessage, setMockLimitsMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchStatus = async () => {
      const { data: signupData, error: signupError } = await supabase.rpc('get_daily_signup_status');
      const [base, silver, gold] = await Promise.all([
        supabase.rpc('get_mock_limit', { plan_name: 'base' }).then((r) => r.data),
        supabase.rpc('get_mock_limit', { plan_name: 'silver' }).then((r) => r.data),
        supabase.rpc('get_mock_limit', { plan_name: 'gold' }).then((r) => r.data),
      ]);
      if (!signupError && signupData) {
        const lim = signupData.limit;
        setLimit(lim === -1 ? '' : String(lim));
        setCountToday(signupData.count_today ?? 0);
      }
      setMockLimits({
        base: base != null ? String(base) : '',
        silver: silver != null ? String(silver) : '',
        gold: gold != null ? String(gold) : '',
      });
      setLoading(false);
    };
    fetchStatus();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    const val = limit.trim() === '' ? -1 : parseInt(limit, 10);
    if (limit.trim() !== '' && (isNaN(val) || val < -1)) {
      setMessage({ type: 'error', text: 'Enter a number ≥ 0, or leave empty for unlimited.' });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc('set_daily_signup_limit', { p_limit: val });
    setSaving(false);
    if (error) {
      setMessage({ type: 'error', text: error.message ?? 'Failed to save.' });
      return;
    }
    if (!data?.ok) {
      setMessage({ type: 'error', text: data?.error ?? 'Failed to save.' });
      return;
    }
    setMessage({ type: 'success', text: 'Saved.' });
    const { data: status } = await supabase.rpc('get_daily_signup_status');
    if (status) setCountToday(status.count_today ?? 0);
  };

  const handleSaveMockLimits = async (e) => {
    e.preventDefault();
    setMockLimitsMessage({ type: '', text: '' });
    const base = mockLimits.base.trim() === '' ? null : parseInt(mockLimits.base, 10);
    const silver = mockLimits.silver.trim() === '' ? null : parseInt(mockLimits.silver, 10);
    const gold = mockLimits.gold.trim() === '' ? null : parseInt(mockLimits.gold, 10);
    if ((base != null && (isNaN(base) || base < -1)) || (silver != null && (isNaN(silver) || silver < -1)) || (gold != null && (isNaN(gold) || gold < -1))) {
      setMockLimitsMessage({ type: 'error', text: 'Enter numbers ≥ 0. Use -1 for unlimited.' });
      return;
    }
    setMockLimitsSaving(true);
    const { data } = await supabase.rpc('set_mock_limits', { p_base: base, p_silver: silver, p_gold: gold });
    setMockLimitsSaving(false);
    if (data?.ok) {
      setMockLimitsMessage({ type: 'success', text: 'Mock limits saved.' });
    } else {
      setMockLimitsMessage({ type: 'error', text: data?.error ?? 'Failed to save.' });
    }
  };

  if (loading) {
    return <PageLoader size="md" label="Loading settings…" className="py-12" />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Settings</h1>
      <p className="text-slate-600 mb-6">
        Configure app-wide limits. Changes take effect immediately.
      </p>

      <section className="rounded-xl border border-slate-200 bg-white p-6 max-w-md">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Daily signup limit</h2>
        <p className="text-slate-600 text-sm mb-4">
          Maximum number of new signups per day. Leave empty or set to -1 for unlimited.
        </p>
        {countToday !== null && (
          <p className="text-sm text-slate-500 mb-3">
            Signups today: <span className="font-medium text-slate-700">{countToday}</span>
          </p>
        )}
        <form onSubmit={handleSave} className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="daily_limit" className="block text-sm font-medium text-slate-700 mb-1">
              Max signups per day
            </label>
            <input
              id="daily_limit"
              type="number"
              min="-1"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="Unlimited"
              className="w-32 px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="nth-btn-primary px-4 py-2 font-medium disabled:opacity-50"
          >
            {saving ? <ButtonLoader label="Saving…" /> : 'Save'}
          </button>
        </form>
        {message.text && (
          <p className={`mt-3 text-sm ${message.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
            {message.text}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 max-w-md mt-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Mock limits per plan</h2>
        <p className="text-slate-600 text-sm mb-4">
          Maximum mock interviews per subscription period. Base / Silver / Gold. Use -1 for unlimited.
        </p>
        <form onSubmit={handleSaveMockLimits} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Base</label>
            <input
              type="number"
              min="-1"
              value={mockLimits.base}
              onChange={(e) => setMockLimits((f) => ({ ...f, base: e.target.value }))}
              className="w-20 px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Silver</label>
            <input
              type="number"
              min="-1"
              value={mockLimits.silver}
              onChange={(e) => setMockLimits((f) => ({ ...f, silver: e.target.value }))}
              className="w-20 px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Gold</label>
            <input
              type="number"
              min="-1"
              value={mockLimits.gold}
              onChange={(e) => setMockLimits((f) => ({ ...f, gold: e.target.value }))}
              className="w-20 px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={mockLimitsSaving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {mockLimitsSaving ? 'Saving…' : 'Save'}
          </button>
        </form>
        {mockLimitsMessage.text && (
          <p className={`mt-3 text-sm ${mockLimitsMessage.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
            {mockLimitsMessage.text}
          </p>
        )}
      </section>
    </div>
  );
}
