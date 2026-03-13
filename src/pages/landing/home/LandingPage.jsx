import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
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
import CTAStrip from './components/CTAStrip';
import InstituteAdModal from './components/InstituteAdModal';
import Seo from '../../../components/Seo';

const LANDING_CLASS = 'nth-landing-page';
/** Delay after page load before showing the ad. */
const AD_DELAY_MS = 5000;
const AD_SCROLL_THRESHOLD_PX = 500;

export default function LandingPage() {
  const [activeAd, setActiveAd] = useState(null);
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
      const { data } = await supabase
        .from('institute_ads')
        .select('id, institute_name, image_url, link_url')
        .eq('is_active', true)
        .maybeSingle();
      if (!cancelled) setActiveAd(data ?? null);
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
    if (adHasOpenedRef.current || !activeAd || !adDelayPassed || !adScrollPassed) return;
    adHasOpenedRef.current = true;
    setInstituteAdOpen(true);
  }, [activeAd, adDelayPassed, adScrollPassed]);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden nth-landing-root">
      <Seo
        title="NTH | Guaranteed interview support with mock interviews and direct slots"
        description="Naveen Talent Hub (NTH) gives you mock interviews with industry pros, direct interview slots, and offer-negotiation help—backed by a 100% refund guarantee."
        canonicalPath="/"
        ogImage="/hero-section/hero-image.jpg"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Naveen Talent Hub',
          url: typeof window !== 'undefined' ? window.location.origin : undefined,
          logo: '/favicon.png',
          sameAs: [
            'https://www.linkedin.com/',
            'https://twitter.com/'
          ]
        }}
      />
      <Navbar />
      <HeroSection />
      <div className="nth-landing-grid">
        <JobOpeningsSection />
        <NTHConnectSection />
        <HowItWorksSection />
        <WhyChooseNTHSection />
        <BestInstituteHyderabadSection />
        <MoneyBackGuaranteeSection />
        <ApplicationSection />
        <CTAStrip />
        <Footer />
      </div>

      <InstituteAdModal
        open={instituteAdOpen && !!activeAd}
        onClose={() => setInstituteAdOpen(false)}
        ad={activeAd ? { imageUrl: activeAd.image_url, linkUrl: activeAd.link_url || '', sponsorLabel: activeAd.institute_name } : null}
      />
    </div>
  );
}
