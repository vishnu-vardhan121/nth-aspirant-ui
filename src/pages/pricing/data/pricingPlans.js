/**
 * Single source of truth for pricing. Base, Silver, Gold.
 * Fresher: Base ₹399; Experienced: Base ₹499. Silver & Gold show xxx.
 */
const basePlan = {
  id: 'base',
  name: 'Base',
  priceNote: '',
  description: 'Essential mock interviews and feedback',
  ctaText: 'Choose Base',
  ctaDisabled: false,
  popular: false,
  features: [
    '3 mocks with IT working professionals',
    'Technical Suggestions',
    'Free job links',
    'Score 90% in mock to get 1 interview',
  ],
};

const silverPlan = {
  id: 'silver',
  name: 'Silver',
  price: 'xxx',
  priceNote: '',
  description: 'Added direct interview opportunities',
  ctaText: 'Choose Silver',
  ctaDisabled: false,
  popular: true,
  features: [
    '3 mocks with IT working professionals',
    'Technical Suggestions',
    'Free job links',
    '2 Direct company interviews',
  ],
};

const goldPlan = {
  id: 'gold',
  name: 'Gold',
  price: 'xxx',
  priceNote: '',
  description: 'Comprehensive support and mentorship',
  ctaText: 'Choose Gold',
  ctaDisabled: false,
  popular: false,
  features: [
    '10 mocks with IT working professionals',
    'Technical Suggestions',
    'Free job links',
    '8 Direct company interviews',
    'Technical Support',
    'Personal assistance',
    '2 sessions with founder Naveen',
  ],
};

export const PRICING_PLANS = {
  fresher: [
    { ...basePlan, price: '399' },
    { ...silverPlan },
    { ...goldPlan },
  ],
  experienced: [
    { ...basePlan, price: '499' },
    { ...silverPlan },
    { ...goldPlan },
  ],
};
