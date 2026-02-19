/**
 * Single source of truth for pricing. Base, Silver, Gold for both fresher and experienced.
 * Keys: fresher | experienced → array of [Base, Silver, Gold].
 */
const PLANS_BASE_SILVER_GOLD = [
  {
    id: 'base',
    name: 'Base',
    price: 'xxx',
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
  },
  {
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
  },
  {
    id: 'gold',
    name: 'Gold',
    price: 'xxxx',
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
  },
];

export const PRICING_PLANS = {
  fresher: PLANS_BASE_SILVER_GOLD,
  experienced: PLANS_BASE_SILVER_GOLD,
};
