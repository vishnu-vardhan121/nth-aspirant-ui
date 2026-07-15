import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { PageLoader } from '../../../components/ui/Loader';
import AnalyticsOverview from './components/AnalyticsOverview';
import TrackStatsTable from './components/TrackStatsTable';
import LevelStatsTable from './components/LevelStatsTable';
import ApiKeysPanel from './components/ApiKeysPanel';

export default function AdminAiPracticePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [keysOpen, setKeysOpen] = useState(false);

  const loadAnalytics = useCallback(async () => {
    setError('');
    const { data, error: rpcError } = await supabase.rpc('get_ai_practice_analytics');
    if (rpcError) {
      setError(rpcError.message || 'Failed to load analytics');
      setAnalytics(null);
      return;
    }
    if (!data?.ok) {
      setError(data?.error || 'Failed to load analytics');
      setAnalytics(null);
      return;
    }
    setAnalytics(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadAnalytics();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAnalytics]);

  const handleKeysChanged = async () => {
    await loadAnalytics();
  };

  if (loading) {
    return <PageLoader size="md" label="Loading AI Practice…" className="py-12" />;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Practice</h1>
          <p className="mt-1 text-slate-600">
            Analytics for role-based AI mock practice. Manage Gemini API keys from this page.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setKeysOpen(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Manage API Keys
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <AnalyticsOverview totals={analytics?.totals} />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <TrackStatsTable tracks={analytics?.tracks} />
        <LevelStatsTable levels={analytics?.levels} />
      </div>

      {Number(analytics?.totals?.active_keys ?? 0) === 0 ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No active Gemini API keys. Click <strong>Manage API Keys</strong> to add at least one before aspirants can start sessions.
        </div>
      ) : null}

      <ApiKeysPanel
        open={keysOpen}
        onClose={() => setKeysOpen(false)}
        onChanged={handleKeysChanged}
      />
    </div>
  );
}
