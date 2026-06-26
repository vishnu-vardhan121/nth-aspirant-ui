export const MOCKS_PER_MONTH = 2;
export const MOCK_GAP_DAYS = 15;

export const MOCK_INTERVIEWER_LABEL = 'IT working professionals';

/** Plan-card bullet — total mocks for the pack duration. */
export function getPlanMockFeature(durationMonths = 1) {
  const months = Math.max(1, Number(durationMonths) || 1);
  const totalMocks = MOCKS_PER_MONTH * months;
  const label = totalMocks === 1 ? 'mock interview' : 'mock interviews';
  return `${totalMocks} ${label} with ${MOCK_INTERVIEWER_LABEL} · ${MOCK_GAP_DAYS}-day gap between each`;
}

/** @deprecated Use getPlanMockFeature(durationMonths) */
export const PLAN_MOCK_FEATURE = getPlanMockFeature(1);

/** Terms shown before payment in the choose-plan modal. */
export const PLAN_CHECKOUT_TERMS = [
  'You are paying only for mock interviews — not for jobs or other services.',
  `Mocks are conducted by ${MOCK_INTERVIEWER_LABEL}.`,
  'Your pack includes 2 mocks per month with a 15-day gap between each. Access ends when the pack expires.',
];

/** 5+ years experience — self-serve checkout disabled. */
export const PACK_CONTACT_EMAIL = 'admin@naveentalenhub.in';

/**
 * Dashboard subscription packs by experience band.
 * planId base = 1 month, silver = 3 months (unchanged for payment API).
 */
const PACK_DEFS = [
  { planId: 'base', name: 'Base', durationMonths: 1, popular: false },
  { planId: 'silver', name: 'Silver', durationMonths: 3, popular: true },
];

/** @type {Record<string, { oneMonth: number, threeMonths: number | null, label: string }>} */
export const EXPERIENCE_BAND_PRICING = {
  fresher: { oneMonth: 499, threeMonths: 999, label: 'Fresher' },
  y1_2: { oneMonth: 599, threeMonths: 1199, label: '1–2 years experience' },
  y2_3: { oneMonth: 699, threeMonths: 1399, label: '2–3 years experience' },
  y3_5: { oneMonth: 1500, threeMonths: null, label: '3–5 years experience' },
  y5_plus: { oneMonth: null, threeMonths: null, label: '5+ years experience' },
};

/**
 * @param {{ track?: string | null, experience_years?: number | string | null } | null | undefined} profile
 * @returns {keyof typeof EXPERIENCE_BAND_PRICING}
 */
export function resolveExperienceBand(profile) {
  const track = profile?.track === 'experienced' ? 'experienced' : 'fresher';
  const raw = profile?.experience_years;
  const years = raw === '' || raw == null ? null : Number(raw);

  if (Number.isFinite(years)) {
    if (years > 5) return 'y5_plus';
    if (years > 3) return 'y3_5';
    if (years > 2) return 'y2_3';
    if (years > 1) return 'y1_2';
    if (years <= 1 && track === 'experienced') return 'y1_2';
  }

  return track === 'experienced' ? 'y1_2' : 'fresher';
}

export function getExperienceBandLabel(band) {
  return EXPERIENCE_BAND_PRICING[band]?.label ?? 'Your experience';
}

export function requiresPackContact(band) {
  return band === 'y5_plus';
}

export function isExperiencedBand(band) {
  return band !== 'fresher';
}

export function getTrackFromBand(band) {
  return band === 'fresher' ? 'fresher' : 'experienced';
}

/** Experienced sub-bands shown when track is not fresher. */
export const EXPERIENCED_BAND_OPTIONS = [
  { value: 'y1_2', label: '1–2 years' },
  { value: 'y2_3', label: '2–3 years' },
  { value: 'y3_5', label: '3–5 years' },
  { value: 'y5_plus', label: '5+ years' },
];

function isExperienceBandKey(value) {
  return typeof value === 'string' && value in EXPERIENCE_BAND_PRICING;
}

/** Products for the selected experience band (or derived from profile). */
export function getSubscriptionProducts(profileOrBand) {
  const band = isExperienceBandKey(profileOrBand)
    ? profileOrBand
    : resolveExperienceBand(profileOrBand);
  const pricing = EXPERIENCE_BAND_PRICING[band];

  return PACK_DEFS.map((def) => {
    const priceInr =
      def.durationMonths === 1 ? pricing.oneMonth : pricing.threeMonths;
    return {
      planId: def.planId,
      name: def.name,
      durationMonths: def.durationMonths,
      durationLabel: def.durationMonths === 1 ? '1 month' : `${def.durationMonths} months`,
      priceInr: priceInr ?? 0,
      popular: def.popular,
      experienceBand: band,
      experienceLabel: pricing.label,
      features: [getPlanMockFeature(def.durationMonths)],
    };
  }).filter((p) => isProductAvailable(p));
}

/** @deprecated Prefer getSubscriptionProducts(profile) */
export const SUBSCRIPTION_PRODUCTS = getSubscriptionProducts({ track: 'fresher' });

export function formatInr(amount) {
  if (amount == null || amount <= 0) return 'Price on request';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

export function formatProductPrice(product) {
  return formatInr(product?.priceInr);
}

export function getProductByPlanId(planId, profileOrBand = 'fresher') {
  return getSubscriptionProducts(profileOrBand).find((p) => p.planId === planId) ?? null;
}

export function isProductAvailable(product) {
  return product != null && product.priceInr > 0 && product.durationMonths > 0;
}
