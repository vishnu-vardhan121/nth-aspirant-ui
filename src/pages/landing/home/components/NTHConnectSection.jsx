import { motion, useReducedMotion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { HiArrowRight } from 'react-icons/hi2';
import SectionContainer from '../../../../components/SectionContainer';

const BANNER_SRC = '/hero-section/nth-connect-banner.webp';

/**
 * NTH Connect — crowded applications vs direct company access + headline/CTA.
 * Two-column layout on large screens; stacked on small. Illustration uses object-contain
 * so the full artwork stays visible, with fluid max-heights for alignment.
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
        viewport: { once: true, margin: '-48px' },
        transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
      };

  const imgFluid =
    'mx-auto w-full max-w-full h-auto object-contain object-center sm:object-center lg:object-right' +
    ' max-h-[min(42svh,26rem)] sm:max-h-[min(46svh,28rem)] md:max-h-[min(48svh,30rem)]' +
    ' lg:max-h-[min(58svh,34rem)] xl:max-h-[min(60svh,38rem)] 2xl:max-h-[40rem]';

  return (
    <section
      id="nth-connect"
      className="relative overflow-x-hidden bg-slate-950 nth-section-y"
      aria-labelledby="nth-connect-heading"
    >
      <SectionContainer className="relative z-10 w-full min-w-0">
        <div
          className={
            'grid min-w-0 grid-cols-1 items-center ' +
            'gap-9 sm:gap-10 md:gap-11 ' +
            'lg:grid-cols-2 lg:items-stretch lg:gap-x-10 lg:gap-y-0 ' +
            'xl:gap-x-14 2xl:gap-x-16'
          }
        >
          {/* Copy + CTA — vertically centred in row on desktop */}
          <div className="order-2 flex min-h-0 min-w-0 w-full flex-col justify-center lg:order-1 lg:py-4 xl:py-6">
            <motion.div
              {...fadeUp}
              className="mx-auto w-full max-w-xl text-center lg:mx-0 lg:text-left"
            >
              <p className="mb-4 inline-flex w-full max-w-full flex-wrap items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-indigo-300 lg:justify-start">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400 shadow-[0_0_0_3px_rgba(129,140,248,0.35)]"
                  aria-hidden
                />
                Career support track
              </p>

              <h2
                id="nth-connect-heading"
                className="text-pretty font-bold tracking-tight text-white wrap-anywhere"
              >
                <span className="block text-[1.625rem] leading-snug sm:text-3xl sm:leading-tight md:text-4xl md:leading-[1.12]">
                  Stronger preparation for
                </span>
                <span className="mt-1 block text-[1.875rem] leading-[1.08] sm:mt-1.5 sm:text-4xl sm:leading-tight md:text-5xl md:leading-[1.08] lg:text-[3.25rem] lg:leading-[1.05]">
                  <span className="bg-linear-to-r from-white via-indigo-100 to-indigo-200 bg-clip-text text-transparent">
                    real opportunities
                  </span>
                </span>
              </h2>

              <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-slate-300 sm:mt-6 sm:text-lg lg:mx-0">
                Most applicants focus on volume. NTH helps you improve your resume, communication, and
                interview readiness so you can pursue suitable roles with more clarity and confidence.
              </p>

              <div className="mt-7 flex justify-center sm:mt-8 lg:justify-start">
                <Link
                  to={pricingTo}
                  className="nth-cta-gradient group relative inline-flex w-full min-w-0 max-w-md cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-950/40 transition-[box-shadow,filter] duration-200 hover:brightness-105 active:brightness-95 sm:w-auto sm:max-w-none sm:px-8 sm:py-4 sm:text-[1.05rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <span className="relative z-10 min-w-0 text-center">View career support</span>
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

          {/* Illustration */}
          <figure className="order-1 flex min-h-0 min-w-0 w-full justify-center lg:order-2 lg:items-center lg:justify-end lg:py-4 xl:py-6">
            <div className="relative w-full max-w-[min(100%,36rem)] lg:max-w-none">
              <div className="relative overflow-hidden rounded-2xl bg-slate-900/50 ring-1 ring-white/12 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)] sm:rounded-[1.25rem]">
                <div className="relative flex w-full items-center justify-center px-3 py-5 sm:px-5 sm:py-6 md:px-6 md:py-7 lg:px-7 lg:py-8 xl:px-8 xl:py-9">
                  <img
                    src={BANNER_SRC}
                    alt="Illustration showing career preparation support versus unstructured job applications"
                    width={1600}
                    height={900}
                    sizes="(max-width: 1023px) min(100vw, 36rem), 50vw"
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className={imgFluid}
                  />
                </div>
                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-indigo-400/15 sm:rounded-[1.25rem]"
                  aria-hidden
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-slate-950 from-5% via-slate-950/55 to-transparent px-3 pb-3 pt-14 sm:px-4 sm:pb-3.5 sm:pt-16">
                  <p className="text-center text-[10px] font-semibold uppercase leading-snug tracking-[0.12em] text-indigo-100/95 sm:text-[11px] sm:tracking-[0.14em] md:text-xs">
                    From scattered applications to clearer career preparation support
                  </p>
                </div>
              </div>
            </div>
          </figure>
        </div>
      </SectionContainer>
    </section>
  );
}
