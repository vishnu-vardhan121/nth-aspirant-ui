import { useEffect } from 'react';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import HeroSection from './components/HeroSection';
import JobOpeningsSection from './components/JobOpeningsSection';
import NTHConnectSection from './components/NTHConnectSection';
import HowItWorksSection from './components/HowItWorksSection';
import TrustSection from './components/TrustSection';
import ApplicationSection from './components/ApplicationSection';
import CTAStrip from './components/CTAStrip';
import Seo from '../../../components/Seo';

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
        <TrustSection />
        <ApplicationSection />
        <CTAStrip />
        <Footer />
      </div>
    </div>
  );
}
