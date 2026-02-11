import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HiXMark } from 'react-icons/hi2';
import { PRICING_PLANS } from './data/pricingPlans';
import ChoiceScreen from './components/ChoiceScreen';
import PricingCards from './components/PricingCards';

export default function PricingPage() {
  const [pricingType, setPricingType] = useState(null);

  const plans = pricingType ? PRICING_PLANS[pricingType] : null;

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: 'rgb(var(--nth-bg-dark))' }}
    >
      <main className="flex-1 flex flex-col min-h-0 relative">
        {pricingType === null ? (
          <>
            <Link
              to="/"
              className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Go to home"
            >
              <HiXMark className="w-6 h-6 sm:w-7 sm:h-7" />
            </Link>
            <ChoiceScreen onSelect={setPricingType} />
          </>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 relative">
            <button
              type="button"
              onClick={() => setPricingType(null)}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Change track"
            >
              <HiXMark className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>
            <PricingCards plans={plans} />
          </div>
        )}
      </main>
    </div>
  );
}
