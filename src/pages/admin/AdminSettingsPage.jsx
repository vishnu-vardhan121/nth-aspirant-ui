import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PageLoader, ButtonLoader } from '../../components/ui/Loader';

export default function AdminSettingsPage() {
  const [limit, setLimit] = useState('');
  const [countToday, setCountToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchStatus = async () => {
      const { data, error } = await supabase.rpc('get_daily_signup_status');
      if (!error && data) {
        const lim = data.limit;
        setLimit(lim === -1 ? '' : String(lim));
        setCountToday(data.count_today ?? 0);
      }
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
    </div>
  );
}
