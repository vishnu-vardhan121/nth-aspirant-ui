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
    '1 fixed interview + 1 bonus interview',
    '2 mocks with IT working professionals',
    'Technical Suggestions',
    'Free job links',
  ],
  ctaNote:
    'Note: If you get 70% to 80% score in the mock, one interview applies.',
};

const silverPlan = {
  id: 'silver',
  name: 'Silver',
  price: 'xxxx',
  priceNote: '',
  description: 'Added direct interview opportunities',
  ctaText: 'Choose Silver',
  ctaDisabled: false,
  popular: true,
  features: [
    '5 direct company interviews + 2 bonus',
    '3 mocks with IT working professionals',
    'Technical Suggestions',
    'Free job links',
  ],
  ctaNote:
    'Note: If you fail in final rounds or HR rounds, the bonus will apply.',
};

const goldPlan = {
  id: 'gold',
  name: 'Gold',
  price: 'xxxx',
  priceNote: '',
  description: 'Comprehensive support and mentorship',
  ctaText: 'Choose Gold',
  ctaDisabled: false,
  popular: false,
  features: [
    '10 direct company interviews + 5 bonus',
    '10 mocks with IT working professionals',
    'Technical Suggestions',
    'Free job links',
    'Technical Support',
    'Personal assistance',
    '2 sessions with founder Naveen',
  ],
  ctaNote:
    'Note: If you fail in final rounds or HR rounds, the bonus will apply.',
};

export const PRICING_PLANS = {
  fresher: [
    { ...basePlan, price: '₹399' },
    { ...silverPlan },
    { ...goldPlan },
  ],
  experienced: [
    { ...basePlan, price: '₹499' },
    { ...silverPlan },
    { ...goldPlan },
  ],
};
