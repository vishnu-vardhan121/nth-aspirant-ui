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
/** localStorage key; value is YYYY-MM-DD of last day we showed the ad (once per day per browser). */
const LANDING_AD_SHOWN_DATE_KEY = 'nth_landing_ad_shown_date';
const SCROLL_THRESHOLD_PX = 500;
const AD_DELAY_MS = 5000;

function getTodayDateKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function LandingPage() {
  const [activeAd, setActiveAd] = useState(null);
  const [instituteAdOpen, setInstituteAdOpen] = useState(false);
  const adTimerRef = useRef(null);
  const adTriggeredRef = useRef(false);
  const fetchedAdRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.add(LANDING_CLASS);
    document.body.classList.add(LANDING_CLASS);
    return () => {
      document.documentElement.classList.remove(LANDING_CLASS);
      document.body.classList.remove(LANDING_CLASS);
    };
  }, []);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    const today = getTodayDateKey();
    if (localStorage.getItem(LANDING_AD_SHOWN_DATE_KEY) === today) return;

    const onScroll = () => {
      if (adTriggeredRef.current) return;
      if (window.scrollY < SCROLL_THRESHOLD_PX) return;

      adTriggeredRef.current = true;

      const fetchPromise = supabase
        .from('institute_ads')
        .select('id, institute_name, image_url, link_url')
        .eq('is_active', true)
        .maybeSingle();

      fetchPromise.then(({ data }) => {
        fetchedAdRef.current = data ?? null;
      });

      adTimerRef.current = window.setTimeout(async () => {
        const { data, error } = await fetchPromise;
        const ad = data ?? fetchedAdRef.current;
        if (ad) {
          setActiveAd(ad);
          setInstituteAdOpen(true);
        }
        localStorage.setItem(LANDING_AD_SHOWN_DATE_KEY, today);
      }, AD_DELAY_MS);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    if (window.scrollY >= SCROLL_THRESHOLD_PX) onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
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
