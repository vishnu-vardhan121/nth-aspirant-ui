import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PRICING_PLANS } from '../data/pricingPlans';
import ChoiceScreen from './components/ChoiceScreen';
import PricingCards from './components/PricingCards';
import { getSafeReturnPath } from '../../../lib/authUtils';
import { useAppSelector } from '../../../store/hooks';
import Seo from '../../../components/Seo';

function BackBar({ isFirstSection, returnTo, onBackToFirst }) {
  return (
    <div className="absolute top-0 left-0 right-0 z-50 p-4 sm:p-6 pointer-events-none">
      <div className="max-w-7xl mx-auto flex justify-end">
        {isFirstSection ? (
          <Link
            to={returnTo}
            className="pointer-events-auto p-2 sm:p-3 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors border border-white/10 bg-slate-900/50 backdrop-blur-md"
            aria-label="Close"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>
        ) : (
          <button
            type="button"
            onClick={onBackToFirst}
            className="pointer-events-auto p-2 sm:p-3 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors border border-white/10 bg-slate-900/50 backdrop-blur-md"
            aria-label="Back"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default function PricingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const trackParam = searchParams.get('track');
  const validTrack =
    trackParam === 'fresher' || trackParam === 'experienced' ? trackParam : null;
  const [pricingType, setPricingType] = useState(validTrack);
  const returnTo = useMemo(() => getSafeReturnPath(searchParams, '/'), [searchParams]);

  const plans = pricingType ? PRICING_PLANS[pricingType] : null;

  const handleSelectPlan = () => {
    if (user) {
      navigate('/dashboard', { replace: false });
      return;
    }
    navigate(`/login?from=${encodeURIComponent('/dashboard')}`);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pricingType]);

  return (
    <div
      className="h-screen flex flex-col overflow-hidden relative bg-slate-950"
    >
      <Seo
        title="Pricing Plans | Naveen Talent Hub"
        description="Choose Fresher or Experienced track, then Base, Silver, or Gold for mock interviews, interview opportunities, and career support-see each plan on the page for inclusions and notes."
        canonicalPath="/pricing"
        ogImage="/hero-section/hero-image.webp"
      />
      
      {/* Clean Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute inset-0 bg-linear-to-b from-indigo-500/5 to-transparent" />
      </div>

      <main className="flex-1 flex flex-col min-h-0 relative z-10 font-sans">
        <BackBar
          isFirstSection={pricingType === null}
          returnTo={returnTo}
          onBackToFirst={() => setPricingType(null)}
        />

        <AnimatePresence mode="wait">
          {pricingType === null ? (
            <motion.div 
              key="choice"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col min-h-0 pt-12 sm:pt-14 overflow-hidden"
            >
              <ChoiceScreen onSelect={setPricingType} />
            </motion.div>
          ) : (
            <motion.div 
              key="cards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col min-h-0 pt-12 sm:pt-14 relative"
            >
              <PricingCards plans={plans} track={pricingType} onSelectPlan={handleSelectPlan} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
