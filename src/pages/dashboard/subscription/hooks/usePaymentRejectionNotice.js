import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchUnseenRejection,
  hasShownRejectionNotice,
  markRejectionNoticeShown,
  rejectionTokenForOrder,
  subscribeToPaymentRejection,
} from '../../../../lib/paymentActivationRealtime';

/**
 * Modal notice when admin rejects a payment — mirrors plan activation celebration.
 */
export function usePaymentRejectionNotice(userId) {
  const [rejection, setRejection] = useState(null);
  const showingRef = useRef(false);

  const openRejection = useCallback(
    (order) => {
      if (!userId || !order?.id || showingRef.current) return;
      const token = rejectionTokenForOrder(order.id);
      if (hasShownRejectionNotice(userId, token)) return;

      showingRef.current = true;
      markRejectionNoticeShown(userId, token);
      setRejection({
        id: order.id,
        plan: order.plan,
        amount_inr: order.amount_inr,
        duration_months: order.duration_months,
        admin_notes: order.admin_notes,
        utr: order.utr,
        reviewed_at: order.reviewed_at,
      });
    },
    [userId],
  );

  const closeRejection = useCallback(() => {
    showingRef.current = false;
    setRejection(null);
  }, []);

  useEffect(() => {
    if (!userId) return undefined;

    let cancelled = false;

    (async () => {
      const pending = await fetchUnseenRejection(userId);
      if (cancelled || !pending) return;
      openRejection(pending);
    })();

    const unsubscribe = subscribeToPaymentRejection(userId, (order) => {
      openRejection(order);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [userId, openRejection]);

  return { rejection, closeRejection };
}
