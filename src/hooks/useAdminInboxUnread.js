import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { fetchAdminHelpDeskSummary } from '../lib/helpDesk';
import { subscribeToAdminMessages } from '../lib/messageRealtime';

const REFRESH_DEBOUNCE_MS = 1200;

/** Unread counts for admin sidebar: NTH Team messages + help desk. */
export function useAdminInboxUnread() {
  const [messagesUnread, setMessagesUnread] = useState(0);
  const [helpDeskUnread, setHelpDeskUnread] = useState(0);
  const refreshTimerRef = useRef(null);
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const [aspirantsRes, helpRes] = await Promise.all([
        supabase.rpc('get_aspirants_for_admin'),
        fetchAdminHelpDeskSummary(),
      ]);
      const aspirants = Array.isArray(aspirantsRes.data) ? aspirantsRes.data : [];
      setMessagesUnread(
        aspirants.reduce((sum, a) => sum + Math.max(0, Number(a.unread_count) || 0), 0),
      );
      if (helpRes.data?.ok) {
        setHelpDeskUnread(
          Number(helpRes.data.main_unread || 0) + Number(helpRes.data.blocked_unread || 0),
        );
      }
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      void refresh();
    }, REFRESH_DEBOUNCE_MS);
  }, [refresh]);

  useEffect(() => {
    void refresh();
    const unsubscribe = subscribeToAdminMessages(scheduleRefresh, { channelId: 'admin-inbox-unread' });
    return () => {
      unsubscribe();
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [refresh, scheduleRefresh]);

  return { messagesUnread, helpDeskUnread, refresh };
}
