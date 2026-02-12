import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { HiXMark } from 'react-icons/hi2';
import { PRICING_PLANS } from '../data/pricingPlans';
import ChoiceScreen from './components/ChoiceScreen';
import PricingCards from './components/PricingCards';

/** Safe return path: same-origin path only, default / */
function getReturnPath(searchParams) {
  const from = searchParams.get('from') || '/';
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) {
    return '/';
  }
  return from;
}

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
  const returnTo = useMemo(() => getReturnPath(searchParams), [searchParams]);

  const plans = pricingType ? PRICING_PLANS[pricingType] : null;

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: 'rgb(var(--nth-bg-dark))' }}
    >
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
            <PricingCards plans={plans} />
          </div>
        )}
      </main>
    </div>
  );
}
