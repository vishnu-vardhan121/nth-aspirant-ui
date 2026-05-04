import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HiShieldCheck, HiArrowRight, HiSparkles } from 'react-icons/hi2';
import SectionContainer from '../../../../components/SectionContainer';

const prefersReducedMotionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

export default function EarlyAccessLandingSection() {
  const reduceMotion = useReducedMotion();
  const v = reduceMotion ? prefersReducedMotionVariants : fadeUp;

  return (
    <section
      id="early-access"
      className="relative nth-section-y border-t border-slate-100 overflow-hidden bg-linear-to-br from-indigo-50/90 via-white to-violet-50/50"
      aria-labelledby="early-access-heading"
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-400/15 blur-3xl motion-reduce:blur-none"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-violet-400/12 blur-3xl motion-reduce:blur-none"
        aria-hidden
      />

      <SectionContainer className="relative z-10">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <motion.div
            className="lg:col-span-7"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={v}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-indigo-700 ring-1 ring-indigo-100 shadow-sm mb-5">
              <HiSparkles className="h-4 w-4 text-indigo-600 shrink-0" aria-hidden />
              Verified shortlist
            </div>
            <h2
              id="early-access-heading"
              className="text-3xl sm:text-4xl md:text-[2.35rem] font-bold tracking-tight text-slate-900 leading-[1.15]"
            >
              Opportunities that{' '}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-violet-600">come to you</span>
            </h2>
            <p className="mt-5 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl">
              Your profile stays in our verified shortlist. When a company needs someone with your skills, we match and connect you
              directly—no need to keep applying everywhere.
            </p>
            <ul className="mt-8 space-y-3 max-w-xl">
              <li className="flex gap-3 text-slate-700">
                <HiShieldCheck className="h-6 w-6 shrink-0 text-emerald-600 mt-0.5" aria-hidden />
                <span className="text-[15px] sm:text-base leading-snug">
                  <span className="font-semibold text-slate-900">Curated access.</span> Roles and intros we stand behind—not a bulk
                  database blast.
                </span>
              </li>
              <li className="flex gap-3 text-slate-700">
                <HiShieldCheck className="h-6 w-6 shrink-0 text-emerald-600 mt-0.5" aria-hidden />
                <span className="text-[15px] sm:text-base leading-snug">
                  <span className="font-semibold text-slate-900">One profile.</span> Share your details once; we reach out when
                  there&apos;s a real fit.
                </span>
              </li>
            </ul>
            <div className="mt-10 flex flex-col sm:flex-row sm:items-center gap-4">
              <Link
                to="/early-access"
                className="group nth-btn-primary inline-flex items-center justify-center gap-2 rounded-2xl px-8 py-4 text-base font-bold shadow-lg shadow-indigo-200/60 cursor-pointer transition-all duration-200 hover:shadow-indigo-300/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Join the shortlist
                <HiArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <Link
                to="/jobs"
                className="inline-flex items-center justify-center text-sm font-bold text-indigo-700 hover:text-indigo-900 underline-offset-4 hover:underline cursor-pointer transition-colors duration-200"
              >
                Browse open roles instead
              </Link>
            </div>
          </motion.div>

          <motion.div
            className="lg:col-span-5"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={v}
          >
            <div className="rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-sm p-6 sm:p-8 shadow-xl shadow-indigo-950/10 ring-1 ring-white/60">
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-2">What happens next</p>
              <ol className="space-y-4 text-sm text-slate-600 leading-relaxed">
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800">
                    1
                  </span>
                  <span>You complete a short profile and upload your resume on the next page.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800">
                    2
                  </span>
                  <span>We review your skills and preferences against active and upcoming hiring needs.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800">
                    3
                  </span>
                  <span>If there&apos;s a match, we connect you directly with the opportunity—no endless forms.</span>
                </li>
              </ol>
            </div>
          </motion.div>
        </div>
      </SectionContainer>
    </section>
  );
}
