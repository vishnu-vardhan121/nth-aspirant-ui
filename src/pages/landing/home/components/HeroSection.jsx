import { Link } from 'react-router-dom';
import { HiSparkles } from 'react-icons/hi2';
import { useAppSelector } from '../../../../store/hooks';
import WeeklyInterviewsMarquee from '../../../../components/WeeklyInterviewsMarquee';

export default function HeroSection() {
  const isAuthenticated = useAppSelector((state) => !!state.auth.user);
  const freeClassesTo = isAuthenticated ? '/dashboard/courses' : '/login';

  return (
    <section id="hero" className="relative min-h-dvh w-full flex flex-col overflow-hidden pt-24 md:pt-28 lg:pt-32">
      {/* Background: full viewport width, cover (edge-to-edge) */}
      <div className="absolute inset-0 z-0 bg-slate-950" aria-hidden />
      <div
        className="absolute inset-0 z-0 w-full bg-cover bg-center bg-no-repeat bg-[url('/hero-section/hero-image.webp')]"
        aria-hidden
      >
        <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/40 to-black/25" aria-hidden />
      </div>

      {/* Content: center headline block; marquee sits below without stretching empty space */}
      <div className="relative z-10 flex-1 flex flex-col px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full pb-6 sm:pb-8">
        <div className="flex-1 flex flex-col justify-center items-center text-center min-h-0 py-5 sm:py-7">
          <div className="max-w-4xl space-y-4 sm:space-y-5">
            <h1 className="text-pretty text-[2rem] leading-[1.08] font-extrabold tracking-[-0.02em] text-white sm:text-5xl sm:leading-[1.06] md:text-5xl lg:text-6xl lg:leading-[1.05] [text-shadow:0_2px_28px_rgba(0,0,0,0.55)]">
              Direct Interviews with Companies
            </h1>

            <p className="text-pretty mx-auto max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg lg:text-xl font-normal [text-shadow:0_1px_16px_rgba(0,0,0,0.45)]">
              No need to apply on job portals. Connect directly with hiring managers.
            </p>
          </div>

          <div
            className="mt-8 flex w-full max-w-lg flex-col items-stretch justify-center gap-3 sm:mt-9 sm:max-w-2xl sm:flex-row sm:flex-wrap sm:items-center sm:gap-4"
            role="group"
            aria-label="Primary actions"
          >
            <div className="cta-moving-border animate-cta-pulse motion-reduce:animate-none sm:min-w-0 sm:flex-1 sm:max-w-[min(100%,20rem)]">
              <Link
                to={`/pricing?from=${encodeURIComponent('/')}`}
                className="relative z-10 flex min-h-14 w-full cursor-pointer items-center justify-center rounded-full bg-white px-8 py-4 text-base font-bold tracking-tight text-slate-900 shadow-lg shadow-black/25 transition-[box-shadow,background-color,filter] duration-200 hover:bg-slate-50 hover:shadow-xl hover:shadow-black/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:brightness-[0.97] sm:min-h-15 sm:px-10 sm:text-lg"
              >
                Start Your Interviews
              </Link>
            </div>
            <Link
              to="/early-access"
              className="group flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-white/85 bg-black/25 px-8 py-4 text-base font-bold tracking-tight text-white shadow-lg shadow-black/20 ring-1 ring-white/25 backdrop-blur-md transition-[background-color,box-shadow,border-color] duration-200 hover:border-white hover:bg-black/35 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:brightness-95 sm:min-h-15 sm:min-w-0 sm:flex-1 sm:max-w-[min(100%,20rem)] sm:px-10 sm:text-lg"
            >
              Save your profile with us
            </Link>
          </div>

          <div className="mt-4 flex w-full max-w-lg justify-center sm:mt-5 sm:max-w-xl px-0">
            <Link
              to={freeClassesTo}
              className="relative inline-flex min-h-12 w-full max-w-md cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full border border-amber-700/40 bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 px-4 py-3.5 text-[13px] font-extrabold leading-snug tracking-tight text-amber-950 shadow-[0_8px_28px_rgba(180,83,9,0.45)] sm:min-h-13 sm:px-8 sm:text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
              aria-label="Get free coding classes and gold"
              style={{ color: '#451a03' }}
            >
              <HiSparkles className="relative z-10 h-4 w-4 shrink-0 text-amber-950 sm:h-5 sm:w-5" aria-hidden />
              <span className="relative z-10 text-center text-amber-950">
                Get Free Coding Classes &amp; Gold
              </span>
            </Link>
          </div>
        </div>

        <WeeklyInterviewsMarquee className="w-full text-left shrink-0 pt-3 sm:pt-5" />
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-24 sm:h-28 bg-linear-to-t from-[rgb(var(--nth-bg-light))] to-transparent z-5 pointer-events-none"
        aria-hidden
      />
    </section>
  );
}
