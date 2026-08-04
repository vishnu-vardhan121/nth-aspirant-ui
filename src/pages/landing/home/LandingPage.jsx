import { useEffect, useState, useRef, useCallback } from 'react';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import HeroSection from './components/HeroSection';
import JobOpeningsSection from './components/JobOpeningsSection';
import NTHConnectSection from './components/NTHConnectSection';
import HowItWorksSection from './components/HowItWorksSection';
import WhyChooseNTHSection from './components/WhyChooseNTHSection';
import BestInstituteHyderabadSection from './components/BestInstituteHyderabadSection';
import MoneyBackGuaranteeSection from './components/MoneyBackGuaranteeSection';
import ApplicationSection from './components/ApplicationSection';
import EarlyAccessLandingSection from './components/EarlyAccessLandingSection';
import CTAStrip from './components/CTAStrip';
import PromoAdModal from '../../../components/PromoAdModal';
import Seo from '../../../components/Seo';
import {
  fetchActivePromoAds,
  markPromoDismissedThisSession,
  pickPromoAd,
  toPromoModalAd,
  wasPromoDismissedThisSession,
} from '../../../lib/promoAds';

const LANDING_CLASS = 'nth-landing-page';
const SITE_URL = 'https://naveentalenthub.in';
const AD_DELAY_MS = 5000;
const AD_SCROLL_THRESHOLD_PX = 500;

export default function LandingPage() {
  const [promoAd, setPromoAd] = useState(null);
  const [adFetchComplete, setAdFetchComplete] = useState(false);
  const [instituteAdOpen, setInstituteAdOpen] = useState(false);
  const [adDelayPassed, setAdDelayPassed] = useState(false);
  const [adScrollPassed, setAdScrollPassed] = useState(false);
  const adTimerRef = useRef(null);
  const adHasOpenedRef = useRef(false);

  useEffect(() => {
    document.documentElement.classList.add(LANDING_CLASS);
    document.body.classList.add(LANDING_CLASS);
    return () => {
      document.documentElement.classList.remove(LANDING_CLASS);
      document.body.classList.remove(LANDING_CLASS);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetchActivePromoAds();
        const picked = pickPromoAd(res.ads || [], { isLanding: true });
        if (!cancelled) {
          setPromoAd(picked && !wasPromoDismissedThisSession(picked.id, 'landing') ? picked : null);
        }
      } finally {
        if (!cancelled) setAdFetchComplete(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY >= AD_SCROLL_THRESHOLD_PX) setAdScrollPassed(true);
    };

    handleScroll();
    adTimerRef.current = window.setTimeout(() => {
      setAdDelayPassed(true);
    }, AD_DELAY_MS);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (adTimerRef.current) window.clearTimeout(adTimerRef.current);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (adHasOpenedRef.current || !adFetchComplete || !adDelayPassed || !adScrollPassed) return;
    if (!promoAd) return;
    adHasOpenedRef.current = true;
    setInstituteAdOpen(true);
  }, [promoAd, adFetchComplete, adDelayPassed, adScrollPassed]);

  const handleAdModalClose = useCallback(() => {
    setInstituteAdOpen(false);
    if (promoAd?.id) markPromoDismissedThisSession(promoAd.id, 'landing');
  }, [promoAd?.id]);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden nth-landing-root">
      <Seo
        title="Naveen Talent Hub | Mock Interviews, Direct Interview Slots & Career Support in India"
        description="Naveen Talent Hub helps tech job aspirants crack interviews with mock interviews, direct company interview slots, resume support, and mentorship. Refund guaranteed if we don't arrange at least one interview on eligible plans."
        keywords="Naveen Talent Hub, NTH, Naveen Talent Hub NTH, Naveen Hub, Naveen Talent, Talent Hub, NTH career Hyderabad, NTH mock interviews, NTH connect, mock interviews India, direct company interviews, tech interview preparation, IT job support India, fresher job placement, experienced IT jobs, career support platform, interview coaching India, job placement Hyderabad, tech career mentorship"
        author="Naveen Talent Hub"
        geoRegion="IN-TG"
        geoPlacename="Hyderabad, Telangana, India"
        canonicalUrl="https://naveentalenthub.in/"
        ogImage="https://naveentalenthub.in/hero-section/hero-image.webp"
        ogTitle="Naveen Talent Hub | Mock Interviews & Direct Interview Slots"
        ogDescription="Naveen Talent Hub helps tech job aspirants crack interviews with mock interviews, direct company interview slots, resume support, and mentorship. Refund guaranteed if we don't arrange at least one interview on eligible plans."
        ogUrl="https://naveentalenthub.in/"
        twitterTitle="Naveen Talent Hub | Mock Interviews & Direct Interview Slots"
        twitterDescription="Naveen Talent Hub helps tech job aspirants crack interviews with mock interviews, direct company interview slots, resume support, and mentorship. Refund guaranteed if we don't arrange at least one interview on eligible plans."
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Naveen Talent Hub',
          alternateName: ['NTH', 'Naveen Talent Hub NTH', 'Naveen Hub', 'Naveen Talent', 'Talent Hub', 'NTH Connect'],
          url: SITE_URL,
          logo: `${SITE_URL}/hero-section/hero-image.webp`,
          description:
            'Naveen Talent Hub provides mock interviews, direct company interview slots, resume support, and career mentorship for tech job aspirants in India.',
          email: 'hello@naveentalenthub.in',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Hyderabad',
            addressRegion: 'Telangana',
            addressCountry: 'IN',
          },
          sameAs: [],
        }}
      />
      <Navbar disableHelpTrigger={instituteAdOpen} />
      <HeroSection />
      <div className="nth-landing-grid">
        <JobOpeningsSection variant="landing" previewLimit={6} viewAllTo="/jobs" />
        <NTHConnectSection />
        <HowItWorksSection />
        <WhyChooseNTHSection />
        <BestInstituteHyderabadSection />
        <MoneyBackGuaranteeSection />
        <ApplicationSection />
        <EarlyAccessLandingSection />
        <CTAStrip />
        <Footer />
      </div>

      <PromoAdModal
        open={instituteAdOpen && Boolean(promoAd)}
        onClose={handleAdModalClose}
        ad={toPromoModalAd(promoAd)}
      />
    </div>
  );
}
