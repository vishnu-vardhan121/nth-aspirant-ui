import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';

/**
 * Load AI Practice progress for all tracks or one track.
 * @param {string|null} trackId
 */
export function useAiPracticeProgress(trackId = null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [levels, setLevels] = useState([]);
  const [trackCompleted, setTrackCompleted] = useState(false);

  const refresh = useCallback(async () => {
    setError('');
    const { data, error: rpcError } = await supabase.rpc('get_ai_practice_progress', {
      p_track: trackId || null,
    });

    if (rpcError) {
      setError(rpcError.message || 'Failed to load progress');
      setTracks([]);
      setLevels([]);
      setSubscriptionActive(false);
      return;
    }

    if (!data?.ok) {
      setError(data?.error || 'Failed to load progress');
      setTracks([]);
      setLevels([]);
      setSubscriptionActive(false);
      return;
    }

    setSubscriptionActive(Boolean(data.subscription_active));

    if (trackId) {
      setLevels(Array.isArray(data.levels) ? data.levels : []);
      setTrackCompleted(Boolean(data.track_completed));
      setTracks([]);
    } else {
      setTracks(Array.isArray(data.tracks) ? data.tracks : []);
      setLevels([]);
      setTrackCompleted(false);
    }
  }, [trackId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return {
    loading,
    error,
    subscriptionActive,
    tracks,
    levels,
    trackCompleted,
    refresh,
  };
}
