import { motion, useReducedMotion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { HiArrowRight } from 'react-icons/hi2';
import SectionContainer from '../../../../components/SectionContainer';

const BANNER_SRC = '/hero-section/nth-connect-banner.png';

/**
 * NTH Connect — visual story (crowded applications vs direct company access) + headline/CTA.
 * Mobile: framed image first (highlighted), copy below on solid surface so type wraps cleanly.
 * Desktop: full-bleed art with a left-weighted scrim so the right side of the frame stays visible.
 */
export default function NTHConnectSection() {
  const location = useLocation();
  const pricingTo = `/pricing?from=${encodeURIComponent(location.pathname || '/')}`;
  const reduceMotion = useReducedMotion();

  const fadeUp = reduceMotion
    ? {
        initial: { opacity: 0 },
        whileInView: { opacity: 1 },
        viewport: { once: true },
        transition: { duration: 0.2 },
      }
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-40px' },
        transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
      };

  return (
    <section
      id="nth-connect"
      className="relative overflow-hidden bg-slate-950 nth-section-y"
      aria-labelledby="nth-connect-heading"
    >
      {/* Desktop / large tablet: full-bleed banner — scrim heavy on the left only so the art stays visible on the right */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
        <img
          src={BANNER_SRC}
          alt=""
          className="h-full w-full object-cover object-[58%_center]"
        />
        <div className="absolute inset-0 bg-linear-to-r from-slate-950 from-0% via-slate-950/82 via-48% to-slate-950/10" />
        <div className="absolute inset-0 bg-linear-to-t from-slate-950/25 via-transparent to-transparent" />
      </div>

      <SectionContainer className="relative z-10 w-full min-w-0">
        <div className="flex min-w-0 flex-col gap-7 lg:min-h-[min(52vh,520px)] lg:justify-center">
          {/* Mobile / tablet: framed art first — focal crop shows the “portals vs direct” story */}
          <figure className="order-1 w-full min-w-0 lg:hidden">
            <div className="relative overflow-hidden rounded-2xl ring-2 ring-white/20 shadow-[0_28px_90px_-24px_rgba(0,0,0,0.75)]">
              <div className="relative aspect-5/6 w-full max-h-[min(52vh,480px)] sm:aspect-16/10 sm:max-h-[min(44vh,420px)]">
                <img
                  src={BANNER_SRC}
                  alt="Illustration contrasting crowded job applications with a direct path to employers through Naveen Talent Hub"
                  className="h-full w-full object-cover object-[80%_38%] sm:object-[76%_42%]"
                  sizes="(max-width: 640px) 100vw, 640px"
                  loading="lazy"
                />
                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-indigo-400/25"
                  aria-hidden
                />
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-slate-950 via-slate-950/70 to-transparent px-4 pb-3.5 pt-14 sm:pt-16">
                  <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-100/95 sm:text-xs">
                    The old application maze — and the direct line NTH opens for you
                  </p>
                </div>
              </div>
            </div>
          </figure>

          {/* Copy + CTA — solid base on mobile; sits on left scrim on lg */}
          <div className="order-2 min-w-0 w-full max-w-xl lg:max-w-104 xl:max-w-xl">
            <motion.div {...fadeUp} className="min-w-0">
              <p className="mb-4 inline-flex max-w-full flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-indigo-300">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400 shadow-[0_0_0_3px_rgba(129,140,248,0.35)]"
                  aria-hidden
                />
                Direct hiring track
              </p>

              <h2
                id="nth-connect-heading"
                className="text-pretty font-bold tracking-tight text-white wrap-anywhere"
              >
                <span className="block text-[1.625rem] leading-snug sm:text-3xl sm:leading-tight md:text-4xl md:leading-[1.12]">
                  Connect directly with
                </span>
                <span className="mt-1 block text-[1.875rem] leading-[1.08] sm:mt-1.5 sm:text-4xl sm:leading-tight md:text-5xl md:leading-[1.08] lg:text-[3.25rem] lg:leading-[1.05]">
                  <span className="bg-linear-to-r from-white via-indigo-100 to-indigo-200 bg-clip-text text-transparent">
                    hiring managers
                  </span>
                </span>
              </h2>

              <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-300 sm:mt-6 sm:text-lg">
                Most candidates stay stuck in the endless application churn. NTH is different: we connect
                you straight to hiring teams so your energy goes into real conversations—not endless forms.
              </p>

              <div className="mt-7 sm:mt-8">
                <Link
                  to={pricingTo}
                  className="nth-cta-gradient group relative inline-flex w-full min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-950/40 transition-[box-shadow,filter] duration-200 hover:brightness-105 active:brightness-95 sm:inline-flex sm:w-auto sm:px-8 sm:py-4 sm:text-[1.05rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <span className="relative z-10 min-w-0 text-center">Get fast-tracked</span>
                  <HiArrowRight
                    className="relative z-10 h-5 w-5 shrink-0 opacity-90 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                    aria-hidden
                  />
                  <span
                    className="pointer-events-none absolute inset-0 rounded-xl bg-white/0 transition-colors duration-200 group-hover:bg-white/10"
                    aria-hidden
                  />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
