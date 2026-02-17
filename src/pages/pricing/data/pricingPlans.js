/**
 * Single source of truth for pricing. Base, Silver, Gold for both fresher and experienced.
 * Keys: fresher | experienced → array of [Base, Silver, Gold].
 */
const PLANS_BASE_SILVER_GOLD = [
  {
    id: 'base',
    name: 'Base',
    price: '₹399',
    priceNote: '/ 3 months',
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
    price: '₹1,200',
    priceNote: '/ 3 months',
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
    price: '₹3,000',
    priceNote: '/ 5 months',
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
