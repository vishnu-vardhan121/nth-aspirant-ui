import { useState, useEffect } from 'react';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import HeroSection from './components/HeroSection';
import JobOpeningsSection from './components/JobOpeningsSection';
import HowItWorksSection from './components/HowItWorksSection';
import TrustSection from './components/TrustSection';
import ApplicationSection from './components/ApplicationSection';
import PricingTeaserSection from './components/PricingTeaserSection';
import CTAStrip from './components/CTAStrip';

export default function LandingPage() {
  const [navVariant, setNavVariant] = useState('hero');

  useEffect(() => {
    const handleScroll = () => {
      const hero = document.getElementById('hero');
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      const isPastHero = rect.bottom < window.innerHeight * 0.5;
      setNavVariant(isPastHero ? 'app' : 'hero');
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar variant={navVariant} />
      <HeroSection />
      <div className="nth-landing-grid">
        <JobOpeningsSection />
        <HowItWorksSection />
        <TrustSection />
        <ApplicationSection />
        <PricingTeaserSection />
        <CTAStrip />
        <Footer />
      </div>
    </div>
  );
}
