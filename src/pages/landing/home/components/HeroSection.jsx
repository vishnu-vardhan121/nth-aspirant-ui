import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../../lib/supabase';

export default function HeroSection() {
  const [interviews, setInterviews] = useState([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('todays_interviews')
        .select('id, name, role, level')
        .order('display_order');
      setInterviews(data ?? []);
    };
    load();
  }, []);

  const list = interviews.length > 0 ? [...interviews, ...interviews] : [];

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

        {/* Today's Interviews scroller – only when there is data for today */}
        {list.length > 0 && (
          <div className="mt-auto w-full text-left pt-8 sm:pt-10">
            <div className="flex items-center justify-between px-1 sm:px-0 mb-3">
              <h2 className="text-[11px] sm:text-xs font-semibold tracking-[0.22em] uppercase text-white/60">
                Today&apos;s Interviews
              </h2>
            </div>
            <div className="w-screen relative left-1/2 -translate-x-1/2 overflow-hidden pb-4">
              <div className="flex w-max animate-marquee gap-3 pl-4 sm:pl-6 lg:pl-8">
                {list.map((item, i) => (
                  <div
                    key={`${item.id}-${i}`}
                    className="min-w-[220px] sm:min-w-[240px] shrink-0 rounded-2xl border border-white/15 bg-black/30 px-4 py-3 sm:px-5 sm:py-4 flex flex-col gap-1.5 text-white/90 shadow-sm hover:bg-black/40 hover:border-white/30 transition-colors"
                  >
                    <p className="text-sm sm:text-base font-semibold truncate text-white">
                      {item.name}
                    </p>
                    <p className="text-[12px] sm:text-sm text-white/80 truncate">
                      {item.role}
                    </p>
                    <span
                      className={`mt-1 inline-flex items-center self-start text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        item.level === 'Fresher'
                          ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/40'
                          : 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
                      }`}
                    >
                      {item.level}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[rgb(var(--nth-bg-light))] to-transparent z-[5] pointer-events-none"
        aria-hidden
      />
    </section>
  );
}
