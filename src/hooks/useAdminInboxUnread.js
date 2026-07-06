import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { fetchAdminHelpDeskSummary } from '../lib/helpDesk';
import { subscribeToAdminMessages } from '../lib/messageRealtime';

/** Unread counts for admin sidebar: NTH Team messages + help desk. */
export function useAdminInboxUnread() {
  const [messagesUnread, setMessagesUnread] = useState(0);
  const [helpDeskUnread, setHelpDeskUnread] = useState(0);

  const refresh = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeToAdminMessages(refresh, { channelId: 'admin-inbox-unread' });
    return unsubscribe;
  }, [refresh]);

  return { messagesUnread, helpDeskUnread, refresh };
}
