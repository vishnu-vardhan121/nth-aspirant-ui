import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { HiXMark } from 'react-icons/hi2';
import { PRICING_PLANS } from '../data/pricingPlans';
import ChoiceScreen from './components/ChoiceScreen';
import PricingCards from './components/PricingCards';
import LeadFormModal from './components/LeadFormModal';
import { getSafeReturnPath } from '../../../lib/authUtils';
import Seo from '../../../components/Seo';

function BackBar({ isFirstSection, returnTo, onBackToFirst }) {
  if (isFirstSection) {
    return (
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-end px-4 sm:px-6 py-3 sm:py-4">
        <Link
          to={returnTo}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <HiXMark className="w-6 h-6 sm:w-7 sm:h-7" />
        </Link>
      </div>
    );
  }
  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-end px-4 sm:px-6 py-3 sm:py-4">
      <button
        type="button"
        onClick={onBackToFirst}
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Back to choice"
      >
        <HiXMark className="w-6 h-6 sm:w-7 sm:h-7" />
      </button>
    </div>
  );
}

export default function PricingPage() {
  const [searchParams] = useSearchParams();
  const trackParam = searchParams.get('track');
  const validTrack =
    trackParam === 'fresher' || trackParam === 'experienced' ? trackParam : null;
  const [pricingType, setPricingType] = useState(validTrack);
  const [leadModal, setLeadModal] = useState(null);
  const [thankYou, setThankYou] = useState(false);
  const returnTo = useMemo(() => getSafeReturnPath(searchParams, '/'), [searchParams]);

  const plans = pricingType ? PRICING_PLANS[pricingType] : null;

  const handleSelectPlan = (plan) => {
    setThankYou(false);
    setLeadModal({ plan, track: pricingType });
  };

  const closeLeadModal = () => setLeadModal(null);

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: 'rgb(var(--nth-bg-dark))' }}
    >
      <Seo
        title="Pricing Plans | Naveen Talent Hub"
        description="Choose Base, Silver, or Gold plans for mock interviews, direct interview slots, and 100% refund protection when milestones are met."
        canonicalPath="/pricing"
        ogImage="/hero-section/hero-image.jpg"
      />
      <main className="flex-1 flex flex-col min-h-0 relative">
          <BackBar
            isFirstSection={pricingType === null}
            returnTo={returnTo}
            onBackToFirst={() => setPricingType(null)}
          />
        {pricingType === null ? (
          <div className="flex-1 flex flex-col pt-12 sm:pt-14">
            <ChoiceScreen onSelect={setPricingType} />
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 relative pt-12 sm:pt-14">
            {thankYou && (
              <div className="mx-4 sm:mx-6 mb-4 p-4 sm:p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm space-y-1">
                <p className="font-medium">Thank you. Our team will contact you.</p>
                <p className="text-emerald-300/90">Is there anything you wish for?</p>
              </div>
            )}
            <PricingCards plans={plans} track={pricingType} onSelectPlan={handleSelectPlan} />
          </div>
        )}
      </main>

      {leadModal && (
        <LeadFormModal
          plan={leadModal.plan}
          track={leadModal.track}
          onClose={closeLeadModal}
          onSuccess={() => setThankYou(true)}
        />
      )}
    </div>
  );
}
