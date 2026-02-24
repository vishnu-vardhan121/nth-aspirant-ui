import { Link } from 'react-router-dom';

/**
 * Static hero section – no animations or motion (avoids slinking/zooming and mobile hang).
 */
export default function HeroSection() {
  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden">
      {/* Background: static image + overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/hero-section/hero-image.jpg')" }}
      >
        <div className="absolute inset-0 bg-slate-900/60" aria-hidden />
      </div>

      {/* Content – no motion */}
      <div className="relative z-10 px-4 sm:px-6 text-center max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl min-[375px]:text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.15] mb-4 sm:mb-6 text-white drop-shadow-2xl max-w-3xl mx-auto">
            Direct{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-300 to-violet-400">
              Interviews
            </span>{' '}
            with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-300 to-violet-400">
              Companies
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-slate-300 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed font-light drop-shadow-md px-1">
            No need to apply on job portals. Connect directly with hiring managers.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 relative">
            <Link
              to={`/pricing?from=${encodeURIComponent('/')}`}
              className="relative bg-white text-slate-900 hover:bg-slate-50 min-w-[280px] text-lg font-bold shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-colors inline-flex items-center justify-center py-4 px-8 rounded-full animate-hero-cta-blink"
            >
              Start Your Interviews
            </Link>

            <div className="hidden md:flex absolute right-[-160px] top-[-20px] bg-slate-900/90 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/10 flex-col items-center rotate-3">
              <span className="text-[10px] font-bold tracking-[0.2em] text-indigo-300 uppercase mb-0.5">
                STATUS
              </span>
              <span className="text-sm font-bold tracking-wide">INTERVIEWING</span>
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[rgb(var(--nth-bg-light))] to-transparent z-20 pointer-events-none"
        aria-hidden
      />
    </section>
  );
}
