import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { subscribeToInterviewerMessages } from '../lib/messageRealtime';

export function sumInterviewerUnread(threads) {
  return (Array.isArray(threads) ? threads : []).reduce(
    (sum, t) => sum + Math.max(0, Number(t.unread_count) || 0),
    0,
  );
}

export function buildUnreadByMockId(threads) {
  const map = {};
  for (const t of Array.isArray(threads) ? threads : []) {
    const id = t.mock_registration_id;
    if (!id) continue;
    map[id] = Math.max(0, Number(t.unread_count) || 0);
  }
  return map;
}

/** Total unread mock-chat messages for the signed-in interviewer (no new RPC). */
export function useInterviewerMessageUnread() {
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [unreadByMockId, setUnreadByMockId] = useState({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.rpc('get_interviewer_message_threads');
    const threads = Array.isArray(data) ? data : [];
    setUnreadTotal(sumInterviewerUnread(threads));
    setUnreadByMockId(buildUnreadByMockId(threads));
    setLoading(false);
    return threads;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

    refresh();

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      const uid = session?.user?.id;
      if (!uid) return;

      unsubscribe = subscribeToInterviewerMessages(uid, refresh);
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [refresh]);

  return { unreadTotal, unreadByMockId, loading, refresh };
}
