import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';

/**
 * Pricing-only interview ticker. Same data source as the landing hero, but UI and
 * animation class are separate so you can change this page without touching the hero.
 */
export default function PricingInterviewsMarquee({ className = '' }) {
  const [interviews, setInterviews] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('todays_interviews')
        .select('id, name, role, level')
        .order('display_order');
      if (!cancelled) setInterviews(data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const list = interviews.length > 0 ? [...interviews, ...interviews] : [];
  if (list.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex items-center justify-between px-1 sm:px-0 mb-2.5">
        <h2 className="text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-400">
          This week&apos;s interviews
        </h2>
      </div>
      <div className="w-screen relative left-1/2 -translate-x-1/2 overflow-hidden pb-1">
        <div className="flex w-max animate-marquee-pricing gap-2.5 sm:gap-3 pl-4 sm:pl-6">
          {list.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              className="min-w-[200px] sm:min-w-[220px] shrink-0 rounded-xl border border-white/10 bg-white/6 px-3.5 py-2.5 sm:px-4 sm:py-3 flex flex-col gap-1 text-slate-200 shadow-sm"
            >
              <p className="text-xs sm:text-sm font-semibold truncate text-white">{item.name}</p>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">{item.role}</p>
              <span
                className={`mt-0.5 inline-flex items-center self-start text-[9px] px-1.5 py-0.5 rounded-md font-medium ${
                  item.level === 'Fresher'
                    ? 'bg-indigo-500/15 text-indigo-200/90 border border-indigo-400/25'
                    : 'bg-emerald-500/15 text-emerald-200/90 border border-emerald-400/25'
                }`}
              >
                {item.level}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
