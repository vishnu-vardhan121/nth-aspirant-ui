import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { HiCheckCircle, HiArrowRight } from 'react-icons/hi';
import SectionContainer from '../../../../components/SectionContainer';

const HIGHLIGHTS = [
  'Direct interviews with top companies',
  'Skip the application queue',
  'Mock interviews with IT professionals',
  'Personalized career guidance',
];

export default function CTAStrip() {
  const location = useLocation();
  const pricingTo = `/pricing?from=${encodeURIComponent(location.pathname || '/')}`;

  return (
    <section className="relative py-24 sm:py-32 md:py-40 overflow-hidden bg-[rgb(var(--nth-bg-hero-start))]">
      {/* Rich gradient background and effects with more depth */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(79,70,229,0.2)_0%,_transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/55 to-slate-950/85" />
        <div className="absolute -top-1/4 -left-1/4 w-[80%] h-[80%] bg-[hsl(var(--nth-primary))/0.18] blur-[120px] rounded-full animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -bottom-1/4 -right-1/4 w-[80%] h-[80%] bg-[hsl(var(--nth-accent))/0.16] blur-[120px] rounded-full animate-pulse" style={{ animationDuration: '12s' }} />
      </div>

      <SectionContainer className="relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col items-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex px-4 py-2 rounded-full bg-white/5 border border-white/10 text-indigo-300 text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] mb-10 backdrop-blur-sm"
          >
            Get Started Today
          </motion.div>

          {/* Headline */}
          <motion.h2
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-8xl font-black text-center text-white mb-8 tracking-tighter leading-[1.05]"
          >
            Stop Applying, <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--nth-primary))] via-[hsl(var(--nth-accent))] to-[hsl(var(--nth-primary-light))] drop-shadow-2xl">
              Start Interviewing
            </span>
          </motion.h2>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-2xl text-indigo-100/60 mb-16 max-w-3xl text-center leading-relaxed font-medium"
          >
            Join thousands of successful candidates who landed their dream jobs
            without the endless application process.
          </motion.p>

          {/* Highlights Grid - Better Spacing and Alignment */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full max-w-4xl mb-20 px-4"
          >
            {HIGHLIGHTS.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/20 hover:bg-white/[0.05] transition-all duration-300 group shadow-2xl backdrop-blur-sm"
              >
                <div className="shrink-0 w-10 h-10 rounded-full bg-[hsl(var(--nth-primary))/0.12] flex items-center justify-center border border-[hsl(var(--nth-primary))/0.35] group-hover:scale-110 transition-transform duration-500">
                  <HiCheckCircle className="w-6 h-6 text-[hsl(var(--nth-primary-light))]" />
                </div>
                <span className="text-white/80 text-base md:text-lg font-semibold tracking-tight">
                  {item}
                </span>
              </div>
            ))}
          </motion.div>

          {/* CTAs - Stack on mobile, side-by-side on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-6 w-full sm:w-auto px-4"
          >
            <Link
              to={pricingTo}
              className="px-12 py-5 rounded-2xl bg-gradient-to-r from-[hsl(var(--nth-primary))] via-[hsl(var(--nth-primary-light))] to-[hsl(var(--nth-accent))] text-white font-black text-xl shadow-[0_20px_50px_-15px_hsl(var(--nth-primary)/0.45)] hover:shadow-[0_24px_60px_-15px_hsl(var(--nth-primary)/0.55)] hover:-translate-y-1.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-3 group"
            >
              View Pricing Plans
              <HiArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
            </Link>
            
            <Link
              to="/contact"
              className="px-12 py-5 rounded-2xl border-2 border-white/12 bg-white/5 text-white font-bold text-xl hover:bg-white/10 hover:border-white/30 backdrop-blur-md transition-all duration-300 flex items-center justify-center"
            >
              Contact Us
            </Link>
          </motion.div>

          {/* Trusted/Success Footer - Elegant Divider */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, delay: 0.8 }}
            className="w-full mt-32 pt-10 border-t border-white/10 flex flex-col sm:flex-row items-center justify-center gap-x-10 gap-y-4 px-4"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-indigo-300/40">Trusted by 10,000+ candidates</span>
            </div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-white/20" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-indigo-300/40">95% success rate</span>
            </div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-white/20" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-indigo-300/40">500+ partner companies</span>
            </div>
          </motion.div>
        </div>
      </SectionContainer>
    </section>
  );
}
