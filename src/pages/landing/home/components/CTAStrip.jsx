import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { HiCheckCircle } from 'react-icons/hi';
import SectionContainer from '../../../../components/SectionContainer';

const HIGHLIGHTS = [
  'Resume and profile support',
  'Mock interview practice with feedback',
  'Communication coaching',
  'Interview preparation guidance',
];

export default function CTAStrip() {
  const location = useLocation();
  const pricingTo = `/pricing?from=${encodeURIComponent(location.pathname || '/')}`;

  return (
    <section id="cta-strip" className="relative py-14 sm:py-16 md:py-20 lg:py-24 overflow-hidden bg-[rgb(var(--nth-bg-hero-start))]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(79,70,229,0.25)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/40 to-slate-950/90" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-500/10 blur-[100px] rounded-full" />
      </div>

      <SectionContainer className="relative z-10">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="inline-flex px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/10 border border-white/20 text-indigo-200 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] sm:tracking-[0.25em] mb-6 sm:mb-8"
          >
            Career preparation support
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-5 tracking-tight leading-[1.1] px-4"
          >
            Prepare Better,{' '}
            <span className="block sm:inline mt-1 sm:mt-0">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400">
                Apply with Clarity
              </span>
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 sm:mb-12 leading-relaxed px-4"
          >
            Build interview readiness with structured mock practice, resume support, and professional
            guidance—then pursue opportunities on your own.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full max-w-2xl mb-10 sm:mb-12 px-4"
          >
            {HIGHLIGHTS.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 sm:gap-4 px-4 py-3 sm:py-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-colors duration-200"
              >
                <div className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-400/30">
                  <HiCheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-300" />
                </div>
                <span className="text-left text-sm sm:text-base font-medium text-white">{item}</span>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 sm:gap-5 px-4"
          >
            <Link
              to={pricingTo}
              className="cta-strip-primary cursor-pointer inline-flex items-center justify-center gap-2 px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-500 to-violet-500 font-bold text-base sm:text-lg text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              View Services
            </Link>
            <Link
              to="/contact"
              className="cta-strip-secondary cursor-pointer inline-flex items-center justify-center px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl border-2 border-white/25 bg-white/5 font-bold text-base sm:text-lg text-white hover:bg-white/10 hover:border-white/40 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Contact Support
            </Link>
          </motion.div>
        </div>
      </SectionContainer>
    </section>
  );
}
