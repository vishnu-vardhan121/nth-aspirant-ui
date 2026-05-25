/**
 * Pricing card copy (display). Checkout amounts come from plan_prices in the database.
 */
const basePlan = {
  id: 'base',
  name: 'Base',
  priceNote: '',
  description: 'Essential mock interview and resume/profile support for early preparation.',
  payable: true,
  ctaText: 'Pay now',
  ctaDisabled: false,
  popular: false,
  features: [
    'Resume and profile review support',
    '2 mock interview practice sessions with IT professionals',
    'Technical preparation suggestions',
    'Curated opportunity discovery links',
  ],
  ctaNote:
    'Note: Bonus preparation support may apply per plan terms when mock performance meets the stated score band.',
};

const silverPlan = {
  id: 'silver',
  name: 'Silver',
  price: '₹499',
  priceNote: '',
  description:
    'Advanced preparation support with additional mock practice, profile feedback, and career readiness guidance.',
  payable: false,
  ctaText: 'Contact us',
  ctaDisabled: false,
  popular: true,
  features: [
    '5 guided application support sessions',
    '2 bonus career preparation support sessions',
    '3 mock interview practice sessions with IT professionals',
    'Technical preparation suggestions',
    'Curated opportunity discovery links',
  ],
  ctaNote:
    'Note: Bonus sessions apply only as described on the pricing page at the time of purchase—not a guarantee of employer response.',
};

const goldPlan = {
  id: 'gold',
  name: 'Gold',
  price: '₹999',
  priceNote: '',
  description:
    'Premium career support with extended mock practice, technical preparation guidance, communication feedback, and profile improvement support.',
  payable: false,
  ctaText: 'Contact us',
  ctaDisabled: false,
  popular: false,
  features: [
    '10 advanced career preparation support sessions',
    '5 bonus career preparation support sessions',
    '10 mock interview practice sessions with IT professionals',
    'Technical preparation suggestions',
    'Curated opportunity discovery links',
    'Technical support',
    'Personal assistance',
    '2 mentorship sessions with founder Naveen',
  ],
  ctaNote:
    'Note: Bonus sessions apply only as described on the pricing page at the time of purchase—not a guarantee of employer response.',
};

export const PRICING_PLANS = {
  fresher: [
    { ...basePlan, price: '₹99' },
    { ...silverPlan },
    { ...goldPlan },
  ],
  experienced: [
    { ...basePlan, price: '₹99' },
    { ...silverPlan },
    { ...goldPlan },
  ],
};
