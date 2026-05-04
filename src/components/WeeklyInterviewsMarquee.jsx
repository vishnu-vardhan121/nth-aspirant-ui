import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/** Landing hero only. Pricing track screen uses `PricingInterviewsMarquee.jsx` beside `ChoiceScreen`. */
export default function WeeklyInterviewsMarquee({ className = '' }) {
  const [interviews, setInterviews] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_public_hero_interviews');
      if (!rpcError && Array.isArray(rpcData)) {
        if (!cancelled) setInterviews(rpcData);
        return;
      }
      const { data: tableData } = await supabase
        .from('todays_interviews')
        .select('id, name, role, level')
        .order('display_order');
      if (!cancelled) setInterviews(tableData ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const list = interviews.length > 0 ? [...interviews, ...interviews] : [];
  if (list.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex items-center justify-between px-1 sm:px-0 mb-3">
        <h2 className="text-[11px] sm:text-xs font-semibold tracking-[0.22em] uppercase text-white/60">
          This Week&apos;s Interviews
        </h2>
      </div>
      <div className="w-screen relative left-1/2 -translate-x-1/2 overflow-hidden pb-4">
        <div className="flex w-max animate-marquee gap-3 pl-4 sm:pl-6 lg:pl-8">
          {list.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              className="min-w-[220px] sm:min-w-[240px] shrink-0 rounded-2xl border border-white/15 bg-black/30 px-4 py-3 sm:px-5 sm:py-4 flex flex-col gap-1.5 text-white/90 shadow-sm hover:bg-black/40 hover:border-white/30 transition-colors"
            >
              <p className="text-sm sm:text-base font-semibold truncate text-white">{item.name}</p>
              <p className="text-[12px] sm:text-sm text-white/80 truncate">{item.role}</p>
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
  );
}
