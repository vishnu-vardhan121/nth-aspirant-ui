import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { MESSAGES_INVALIDATE_EVENT } from '../../../lib/messagesEvents';

/** Scheduled mock registrations for the current aspirant (newest scheduled first). */
export function useUpcomingScheduledMocks(userId) {
  const [mocks, setMocks] = useState([]);
  const [loading, setLoading] = useState(Boolean(userId));

  const refresh = useCallback(async () => {
    if (!userId) {
      setMocks([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('mock_registrations')
      .select('id, scheduled_at, meet_link, status, created_at')
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true, nullsFirst: false });

    if (!error) {
      setMocks(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    setLoading(Boolean(userId));
    refresh();
  }, [userId, refresh]);

  useEffect(() => {
    const onInvalidate = () => refresh();
    window.addEventListener(MESSAGES_INVALIDATE_EVENT, onInvalidate);
    return () => window.removeEventListener(MESSAGES_INVALIDATE_EVENT, onInvalidate);
  }, [refresh]);

  return { mocks, loading, refresh, nextMock: mocks[0] ?? null, count: mocks.length };
}

export function formatMockScheduleTime(iso) {
  if (!iso) return 'Time to be confirmed';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** True if mock is within 24h (upcoming) or started within last 2h (still joinable). */
export function isMockScheduleUrgent(iso) {
  if (!iso) return true;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return false;
  const now = Date.now();
  const twoHoursMs = 2 * 60 * 60 * 1000;
  const dayMs = 24 * 60 * 60 * 1000;
  return t - now <= dayMs && t + twoHoursMs >= now;
}
