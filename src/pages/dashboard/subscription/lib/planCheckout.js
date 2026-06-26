import { getSubscriptionProducts } from '../data/subscriptionProducts';

/** Self-serve checkout tiers (dashboard UPI). Gold is admin-only — no upgrade UI. */
export const SELF_SERVE_PLANS = ['base', 'silver'];

/** @param {string | null | undefined} plan */
export function isMaxSelfServePlan(plan) {
  return plan === 'silver' || plan === 'gold';
}

/**
 * Show "Get a plan" / "Upgrade" in navbar and job CTAs.
 * Silver or gold subscribers see nothing.
 */
export function shouldShowPlanAction(plan, hasActivePlan) {
  if (!hasActivePlan) return true;
  return plan === 'base';
}

/**
 * Plans to show in the modal.
 * - No subscription → Base + Silver
 * - Base → Silver only (upgrade)
 * - Silver / Gold → none
 */
export function getSelectablePlans(track, plan, hasActivePlan) {
  const products = getSubscriptionProducts(track ?? 'fresher');
  if (!hasActivePlan) return products;
  if (plan === 'base') return products.filter((p) => p.planId === 'silver');
  return [];
}

export function getPlanModalTitle({ step, productName, hasActivePlan, plan }) {
  if (step === 'pay' && productName) return `Pay for ${productName}`;
  if (hasActivePlan && plan === 'base') return 'Upgrade your plan';
  if (!hasActivePlan) return 'Choose your plan';
  return 'Your plan';
}
