import { Link } from 'react-router-dom';
import WeeklyInterviewsMarquee from '../../../../components/WeeklyInterviewsMarquee';

export default function HeroSection() {
  return (
    <section id="hero" className="relative min-h-dvh flex flex-col overflow-hidden pt-24 md:pt-28 lg:pt-32">
      {/* Background: static image + overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/hero-section/hero-image.jpg')" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.25) 100%)',
          }}
          aria-hidden
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col px-4 sm:px-6 lg:px-8 text-center max-w-6xl mx-auto w-full items-center mt-16 sm:mt-12 md:mt-10 lg:mt-7 mb-16">
        <h1 className="text-5xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-6xl font-bold tracking-tight leading-[1.05] mb-5 sm:mb-6 lg:mb-8 text-white drop-shadow-lg">
          Direct Interviews with Companies
        </h1>

        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white max-w-4xl mx-auto mb-8 sm:mb-10 font-medium [text-shadow:0_2px_4px_rgba(0,0,0,0.8)]">
          No need to apply on job portals. Connect directly with hiring managers.
        </p>

        <div className="cta-moving-border animate-cta-pulse">
          <Link
            to={`/pricing?from=${encodeURIComponent('/')}`}
            className="bg-white min-w-[280px] text-lg sm:text-xl font-bold py-4 sm:py-5 px-8 sm:px-10 rounded-full transition-all inline-flex items-center justify-center hover:-translate-y-0.5 active:translate-y-0 shadow-lg !text-slate-900 hover:!text-slate-900 hover:bg-slate-50"
          >
            Start Your Interviews
          </Link>
        </div>

        <WeeklyInterviewsMarquee className="mt-auto w-full text-left pt-8 sm:pt-10" />
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[rgb(var(--nth-bg-light))] to-transparent z-[5] pointer-events-none"
        aria-hidden
      />
    </section>
  );
}
