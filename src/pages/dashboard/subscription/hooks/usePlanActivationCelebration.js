import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { fetchAspirantProfile } from '../../../../store/slices/aspirantSlice';
import { isSubscriptionActive } from '../../../../lib/planLimits';
import { subscribeToAspirantProfile } from '../../../../lib/aspirantProfileRealtime';
import {
  celebrationTokenForOrder,
  celebrationTokenForProfile,
  fetchUncelebratedApproval,
  hasShownCelebration,
  markCelebrationShown,
  subscribeToPaymentApproval,
} from '../../../../lib/paymentActivationRealtime';

/**
 * Celebration when admin approves payment — listens to profile, payment_orders, and mount check.
 */
export function usePlanActivationCelebration(userId) {
  const dispatch = useAppDispatch();
  const profile = useAppSelector((state) => state.aspirant.profile);
  const [celebration, setCelebration] = useState(null);
  const showingRef = useRef(false);
  const profileSnapshotRef = useRef(null);
  const profileReadyRef = useRef(false);

  const openCelebration = useCallback(
    ({ token, plan }) => {
      if (!userId || !token || showingRef.current) return;
      if (hasShownCelebration(userId, token)) return;

      showingRef.current = true;
      markCelebrationShown(userId, token);
      dispatch(fetchAspirantProfile(userId));
      setCelebration({ plan: plan ?? 'base' });
    },
    [userId, dispatch],
  );

  const closeCelebration = useCallback(() => {
    showingRef.current = false;
    setCelebration(null);
  }, []);

  const tryCelebrateProfile = useCallback(
    (nextPlan, nextStartedAt) => {
      if (!nextPlan || !nextStartedAt || !isSubscriptionActive(nextPlan, nextStartedAt)) return;

      const prev = profileSnapshotRef.current;
      const changed =
        prev &&
        (prev.plan !== nextPlan || prev.plan_started_at !== nextStartedAt);

      if (changed) {
        openCelebration({
          token: celebrationTokenForProfile(nextPlan, nextStartedAt),
          plan: nextPlan,
        });
      }
    },
    [openCelebration],
  );

  useEffect(() => {
    if (!userId || !profile) return;

    if (!profileReadyRef.current) {
      profileReadyRef.current = true;
      profileSnapshotRef.current = {
        plan: profile.plan,
        plan_started_at: profile.plan_started_at,
      };
      return;
    }

    tryCelebrateProfile(profile.plan, profile.plan_started_at);
    profileSnapshotRef.current = {
      plan: profile.plan,
      plan_started_at: profile.plan_started_at,
    };
  }, [userId, profile?.plan, profile?.plan_started_at, tryCelebrateProfile]);

  useEffect(() => {
    if (!userId) return undefined;

    let cancelled = false;

    const refetchProfile = () => {
      dispatch(fetchAspirantProfile(userId));
    };

    (async () => {
      const pending = await fetchUncelebratedApproval(userId);
      if (cancelled || !pending) return;
      openCelebration({
        token: celebrationTokenForOrder(pending.id),
        plan: pending.plan,
      });
    })();

    const unsubscribePayment = subscribeToPaymentApproval(userId, (order) => {
      refetchProfile();
      openCelebration({
        token: celebrationTokenForOrder(order.id),
        plan: order.plan,
      });
    });

    const unsubscribeProfile = subscribeToAspirantProfile(userId, refetchProfile);

    return () => {
      cancelled = true;
      unsubscribePayment();
      unsubscribeProfile();
    };
  }, [userId, dispatch, openCelebration]);

  return { celebration, closeCelebration };
}
