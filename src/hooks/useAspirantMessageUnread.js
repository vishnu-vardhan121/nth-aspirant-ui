import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { subscribeToAspirantMessages } from '../lib/messageRealtime';
import { MESSAGES_INVALIDATE_EVENT } from '../lib/messagesEvents';
import { countTotalUnread } from '../lib/aspirantChatKeys';

/** Unread incoming messages for the signed-in aspirant (uses existing get_my_messages RPC). */
export function useAspirantMessageUnread() {
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.rpc('get_my_messages');
    const messages = Array.isArray(data) ? data : [];
    setUnreadTotal(countTotalUnread(messages));
    setLoading(false);
    return messages;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

    refresh();

    const onInvalidate = () => {
      void refresh();
    };
    window.addEventListener(MESSAGES_INVALIDATE_EVENT, onInvalidate);

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      const uid = session?.user?.id;
      if (!uid) return;

      unsubscribe = subscribeToAspirantMessages(uid, refresh, {
        channelId: `aspirant-unread-${uid}`,
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener(MESSAGES_INVALIDATE_EVENT, onInvalidate);
    };
  }, [refresh]);

  return { unreadTotal, loading, refresh };
}
