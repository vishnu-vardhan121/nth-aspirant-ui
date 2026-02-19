import { useEffect } from 'react';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import HeroSection from './components/HeroSection';
import JobOpeningsSection from './components/JobOpeningsSection';
import HowItWorksSection from './components/HowItWorksSection';
import TrustSection from './components/TrustSection';
import ApplicationSection from './components/ApplicationSection';
import CTAStrip from './components/CTAStrip';

const LANDING_CLASS = 'nth-landing-page';

export default function LandingPage() {
  useEffect(() => {
    document.documentElement.classList.add(LANDING_CLASS);
    document.body.classList.add(LANDING_CLASS);
    return () => {
      document.documentElement.classList.remove(LANDING_CLASS);
      document.body.classList.remove(LANDING_CLASS);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden nth-landing-root">
      <Navbar />
      <HeroSection />
      <div className="nth-landing-grid">
        <JobOpeningsSection />
        <HowItWorksSection />
        <TrustSection />
        <ApplicationSection />
        <CTAStrip />
        <Footer />
      </div>
    </div>
  );
}
