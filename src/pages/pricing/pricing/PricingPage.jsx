import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ChoiceScreen from './components/ChoiceScreen';
import { getSafeReturnPath, getDashboardAuthPath } from '../../../lib/authUtils';
import { useAppSelector } from '../../../store/hooks';
import Seo from '../../../components/Seo';

export default function PricingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const returnTo = useMemo(() => getSafeReturnPath(searchParams, '/'), [searchParams]);

  const handleTrackSelect = () => {
    navigate(getDashboardAuthPath(!!user), { replace: true });
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden relative bg-slate-950">
      <Seo
        title="Pricing Plans | Naveen Talent Hub"
        description="Choose Fresher or Experienced to continue to your Naveen Talent Hub dashboard for mock interviews, jobs, and career support."
        canonicalPath="/pricing"
        ogImage="/hero-section/hero-image.webp"
      />

      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute inset-0 bg-linear-to-b from-indigo-500/5 to-transparent" />
      </div>

      <main className="flex-1 flex flex-col min-h-0 relative z-10 font-sans">
        <div className="absolute top-0 left-0 right-0 z-50 p-4 sm:p-6 pointer-events-none">
          <div className="max-w-7xl mx-auto flex justify-end">
            <Link
              to={returnTo}
              className="pointer-events-auto p-2 sm:p-3 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors border border-white/10 bg-slate-900/50 backdrop-blur-md"
              aria-label="Close"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Link>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col min-h-0 pt-12 sm:pt-14 overflow-hidden"
        >
          <ChoiceScreen onSelect={handleTrackSelect} />
        </motion.div>
      </main>
    </div>
  );
}
