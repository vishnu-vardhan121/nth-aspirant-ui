import { useEffect, useState, useRef, useCallback } from 'react';
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
import EarlyAccessLandingSection from './components/EarlyAccessLandingSection';
import CTAStrip from './components/CTAStrip';
import InstituteAdModal, { LANDING_INSTITUTE_AD_DISMISS_KEY } from './components/InstituteAdModal';
import Seo from '../../../components/Seo';

const LANDING_CLASS = 'nth-landing-page';
const SITE_URL = 'https://naveentalenthub.in';
/** Delay after page load before showing the ad. */
const AD_DELAY_MS = 5000;
const AD_SCROLL_THRESHOLD_PX = 500;

export default function LandingPage() {
  const [activeAd, setActiveAd] = useState(null);
  const [adFetchComplete, setAdFetchComplete] = useState(false);
  const [instituteAdOpen, setInstituteAdOpen] = useState(false);
  const [helpDeskOpen, setHelpDeskOpen] = useState(false);
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
        const { data } = await supabase
          .from('institute_ads')
          .select('id, institute_name, image_url, link_url')
          .eq('is_active', true)
          .maybeSingle();
        if (!cancelled) setActiveAd(data ?? null);
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
    if (adHasOpenedRef.current || helpDeskOpen || !adFetchComplete || !adDelayPassed || !adScrollPassed) return;
    if (!activeAd) {
      try {
        if (typeof window !== 'undefined' && window.localStorage.getItem(LANDING_INSTITUTE_AD_DISMISS_KEY) === '1') return;
      } catch {
        /* ignore */
      }
    }
    adHasOpenedRef.current = true;
    setInstituteAdOpen(true);
  }, [activeAd, adFetchComplete, adDelayPassed, adScrollPassed, helpDeskOpen]);

  const handleAdModalClose = useCallback((opts) => {
    setInstituteAdOpen(false);
    if (opts?.dontShowAgain) {
      try {
        window.localStorage.setItem(LANDING_INSTITUTE_AD_DISMISS_KEY, '1');
      } catch {
        /* ignore */
      }
    }
  }, []);

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
      <Navbar
        helpModalOpen={helpDeskOpen}
        onHelpModalOpenChange={setHelpDeskOpen}
        disableHelpTrigger={instituteAdOpen}
      />
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

      <InstituteAdModal
        open={instituteAdOpen && adFetchComplete}
        onClose={handleAdModalClose}
        ad={
          activeAd
            ? {
                imageUrl: activeAd.image_url,
                linkUrl: activeAd.link_url || '',
                sponsorLabel: activeAd.institute_name,
              }
            : { isFallback: true }
        }
      />
    </div>
  );
}
