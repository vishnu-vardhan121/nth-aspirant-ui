import { useMemo } from 'react';
import { useAppSelector } from '../../../../store/hooks';
import { isSubscriptionActive } from '../../../../lib/planLimits';
import {
  getSelectablePlans,
  isMaxSelfServePlan,
  shouldShowPlanAction,
} from '../lib/planCheckout';
import { resolveExperienceBand } from '../data/subscriptionProducts';

/** Aspirant plan state for dashboard UI (navbar, gates, modals). */
export function useSubscriptionStatus() {
  const profile = useAppSelector((state) => state.aspirant.profile);

  return useMemo(() => {
    const plan = profile?.plan ?? null;
    const track = profile?.track ?? null;
    const planStartedAt = profile?.plan_started_at ?? null;
    const hasActivePlan = !!plan && isSubscriptionActive(plan, planStartedAt);
    const showPlanAction = shouldShowPlanAction(plan, hasActivePlan);
    const profileExperienceBand = resolveExperienceBand(profile);
    const canUpgrade = hasActivePlan && plan === 'base';
    const isOnMaxPlan = hasActivePlan && isMaxSelfServePlan(plan);

    return {
      profile,
      plan,
      track,
      planStartedAt,
      hasActivePlan,
      showPlanAction,
      profileExperienceBand,
      canUpgrade,
      isOnMaxPlan,
    };
  }, [profile]);
}
