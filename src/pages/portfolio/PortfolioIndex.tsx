import React, { useState, useEffect } from 'react';
import LoadingScreen from './components/LoadingScreen';
import HeroSection from './components/HeroSection';
import SelectedWorksSection from './components/SelectedWorksSection';
import JournalSection from './components/JournalSection';
import ExplorationsSection from './components/ExplorationsSection';
import StatsSection from './components/StatsSection';
import FooterSection from './components/FooterSection';

export default function PortfolioIndex() {
  const [isLoading, setIsLoading] = useState(true);

  // Apply forced dark theme root class to body
  useEffect(() => {
    document.body.classList.add('portfolio-root');
    return () => {
      document.body.classList.remove('portfolio-root');
    };
  }, []);

  return (
    <div className="portfolio-root bg-bg text-text-primary min-h-screen selection:bg-text-primary selection:text-bg">
      {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}
      
      {!isLoading && (
        <div className="opacity-0 animate-[fade-in_1s_ease-out_forwards]">
          <main>
            <HeroSection />
            <SelectedWorksSection />
            <JournalSection />
            <ExplorationsSection />
            <StatsSection />
          </main>
          <FooterSection />
        </div>
      )}
    </div>
  );
}
