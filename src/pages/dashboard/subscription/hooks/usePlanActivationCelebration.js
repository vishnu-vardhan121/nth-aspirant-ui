import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { fetchAspirantProfile } from '../../../../store/slices/aspirantSlice';
import { isSubscriptionActive } from '../../../../lib/planLimits';
import { subscribeToAspirantProfile } from '../../../../lib/aspirantProfileRealtime';
import { getMyRecentGoldenCourseGrant } from '../../../../lib/courses';
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
  const celebrationRef = useRef(null);
  const profileSnapshotRef = useRef(null);
  const profileReadyRef = useRef(false);

  const openCelebration = useCallback(
    ({ token, plan, kind = 'plan', courseId = null, courseTitle = '' }) => {
      if (!userId || !token || showingRef.current) return;
      if (hasShownCelebration(userId, token)) return;

      showingRef.current = true;
      const next = { plan: plan ?? 'base', token, kind, courseId, courseTitle };
      celebrationRef.current = next;
      dispatch(fetchAspirantProfile(userId));
      setCelebration(next);
    },
    [userId, dispatch],
  );

  const closeCelebration = useCallback(() => {
    const current = celebrationRef.current;
    if (userId && current?.token) {
      markCelebrationShown(userId, current.token);
    }
    showingRef.current = false;
    celebrationRef.current = null;
    setCelebration(null);
  }, [userId]);

  const checkUncelebratedApproval = useCallback(async () => {
    if (!userId) return;
    const pending = await fetchUncelebratedApproval(userId);
    if (!pending) return;
    openCelebration({
      token: celebrationTokenForOrder(pending.id),
      plan: pending.plan,
    });
  }, [userId, openCelebration]);

  const tryCelebrateProfile = useCallback(
    async (nextPlan, nextStartedAt) => {
      if (!nextPlan || !nextStartedAt || !isSubscriptionActive(nextPlan, nextStartedAt)) return;

      const prev = profileSnapshotRef.current;
      const changed =
        prev &&
        (prev.plan !== nextPlan || prev.plan_started_at !== nextStartedAt);

      if (!changed) return;

      const token = celebrationTokenForProfile(nextPlan, nextStartedAt);

      // Gold can be granted by a placement purchase OR by a Golden Batch course's
      // first payment approval — check which one actually happened before choosing copy.
      if (nextPlan === 'gold' && userId) {
        const goldenCourse = await getMyRecentGoldenCourseGrant(userId, nextStartedAt);
        if (goldenCourse) {
          openCelebration({
            token,
            plan: nextPlan,
            kind: 'course_golden',
            courseId: goldenCourse.courseId,
            courseTitle: goldenCourse.courseTitle,
          });
          return;
        }
      }

      openCelebration({ token, plan: nextPlan, kind: 'plan' });
    },
    [openCelebration, userId],
  );

  useEffect(() => {
    if (!userId || !profile) return;

    if (!profileReadyRef.current) {
      profileReadyRef.current = true;
      profileSnapshotRef.current = {
        plan: profile.plan,
        plan_started_at: profile.plan_started_at,
      };
      void checkUncelebratedApproval();
      return;
    }

    tryCelebrateProfile(profile.plan, profile.plan_started_at);
    profileSnapshotRef.current = {
      plan: profile.plan,
      plan_started_at: profile.plan_started_at,
    };
  }, [userId, profile, profile?.plan, profile?.plan_started_at, tryCelebrateProfile, checkUncelebratedApproval]);

  useEffect(() => {
    if (!userId) return undefined;

    let cancelled = false;

    const refetchProfile = () => {
      dispatch(fetchAspirantProfile(userId));
    };

    (async () => {
      if (cancelled) return;
      await checkUncelebratedApproval();
    })();

    const unsubscribePayment = subscribeToPaymentApproval(userId, (order) => {
      refetchProfile();
      openCelebration({
        token: celebrationTokenForOrder(order.id),
        plan: order.plan,
      });
    });

    const unsubscribeProfile = subscribeToAspirantProfile(userId, () => {
      refetchProfile();
      void checkUncelebratedApproval();
    });

    return () => {
      cancelled = true;
      unsubscribePayment();
      unsubscribeProfile();
    };
  }, [userId, dispatch, openCelebration, checkUncelebratedApproval]);

  return { celebration, closeCelebration };
}
