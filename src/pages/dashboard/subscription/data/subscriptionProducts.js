/** Shown on every plan card in the choose-plan modal. */
export const PLAN_MOCK_FEATURE = 'Monthly 2 mocks with 15 days gap';

/** Eligibility note shown above plan cards. */
export const PLAN_EXPERIENCE_NOTE =
  'These plans are for aspirants with up to 2 years of experience only.';

/**
 * Dashboard subscription packs — edit prices here when plans change.
 * Base price differs by track (fresher vs experienced), matching public pricing.
 */
const PACK_DEFS = [
  {
    planId: 'base',
    name: 'Base',
    durationMonths: 1,
    priceByTrack: { fresher: 399, experienced: 499 },
    popular: false,
  },
  {
    planId: 'silver',
    name: 'Silver',
    durationMonths: 3,
    priceByTrack: { fresher: 999, experienced: 999 },
    popular: true,
  },
];

function normalizeTrack(track) {
  return track === 'experienced' ? 'experienced' : 'fresher';
}

/** Products for the aspirant's track (fresher / experienced). */
export function getSubscriptionProducts(track = 'fresher') {
  const t = normalizeTrack(track);
  return PACK_DEFS.map((def) => {
    const priceInr = def.priceByTrack[t];
    return {
      planId: def.planId,
      name: def.name,
      durationMonths: def.durationMonths,
      durationLabel: def.durationMonths === 1 ? '1 month' : `${def.durationMonths} months`,
      priceInr,
      popular: def.popular,
      track: t,
      features: [PLAN_MOCK_FEATURE],
    };
  });
}

/** @deprecated Prefer getSubscriptionProducts(track) */
export const SUBSCRIPTION_PRODUCTS = getSubscriptionProducts('fresher');

export function formatInr(amount) {
  if (amount == null || amount <= 0) return 'Price on request';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

export function formatProductPrice(product) {
  return formatInr(product?.priceInr);
}

export function getProductByPlanId(planId, track = 'fresher') {
  return getSubscriptionProducts(track).find((p) => p.planId === planId) ?? null;
}

export function isProductAvailable(product) {
  return product != null && product.priceInr > 0 && product.durationMonths > 0;
}
