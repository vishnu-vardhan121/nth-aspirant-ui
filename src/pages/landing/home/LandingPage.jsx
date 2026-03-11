import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import HeroSection from './components/HeroSection';
import JobOpeningsSection from './components/JobOpeningsSection';
import NTHConnectSection from './components/NTHConnectSection';
import HowItWorksSection from './components/HowItWorksSection';
import WhyChooseNTHSection from './components/WhyChooseNTHSection';
import MoneyBackGuaranteeSection from './components/MoneyBackGuaranteeSection';
import ApplicationSection from './components/ApplicationSection';
import CTAStrip from './components/CTAStrip';
import InstituteAdModal from './components/InstituteAdModal';
import Seo from '../../../components/Seo';

const LANDING_CLASS = 'nth-landing-page';
/** Delay after page load before fetching/showing ad (every refresh = new mount = new timer). */
const AD_DELAY_MS = 5000;

export default function LandingPage() {
  const [activeAd, setActiveAd] = useState(null);
  const [instituteAdOpen, setInstituteAdOpen] = useState(false);
  const adTimerRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.add(LANDING_CLASS);
    document.body.classList.add(LANDING_CLASS);
    return () => {
      document.documentElement.classList.remove(LANDING_CLASS);
      document.body.classList.remove(LANDING_CLASS);
    };
  }, []);

  useEffect(() => {
    const fetchPromise = supabase
      .from('institute_ads')
      .select('id, institute_name, image_url, link_url')
      .eq('is_active', true)
      .maybeSingle();

    adTimerRef.current = window.setTimeout(async () => {
      const { data } = await fetchPromise;
      if (data) {
        setActiveAd(data);
        setInstituteAdOpen(true);
      }
    }, AD_DELAY_MS);

    return () => {
      if (adTimerRef.current) window.clearTimeout(adTimerRef.current);
    };
  }, []);

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
