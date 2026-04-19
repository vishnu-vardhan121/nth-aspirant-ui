import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { HiBellAlert } from 'react-icons/hi2';
import SectionContainer from '../../../../components/SectionContainer';

/**
 * NTH Connect section – "Connect directly with hiring managers".
 * Always shown as the third section on the landing page.
 */
export default function NTHConnectSection() {
  const location = useLocation();
  const pricingTo = `/pricing?from=${encodeURIComponent(location.pathname || '/')}`;

  return (
    <section
      id="nth-connect"
      className="relative min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] flex items-center overflow-hidden py-12 lg:py-20"
    >
      {/* High-Impact Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/hero-section/Gemini_Generated_Image_fmv3s7fmv3s7fmv3.png"
          alt="Direct Path to Hiring"
          className="w-full h-full object-cover object-[85%_center] lg:object-center"
        />
        {/* Multistage Gradient for Professional Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-transparent lg:via-slate-950/30" />
      </div>

      <SectionContainer className="relative z-10 w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl lg:max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {/* Minimalist Badge */}
            <div className="inline-flex items-center gap-2 mb-6">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,1)]" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-indigo-400">
                Direct hiring track
              </span>
            </div>

            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[0.95] tracking-tighter mb-6">
              Connect <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-indigo-400 to-indigo-300">
                directly
              </span> with <br className="hidden sm:block" />
              <span className="font-display italic text-indigo-100 font-normal">hiring managers</span>
            </h2>

            <p className="text-base sm:text-lg md:text-xl text-indigo-50/70 mb-10 max-w-lg leading-relaxed font-medium">
              We&apos;ve cleared the clutter. Skip the broken job portals and step through the 
              gate to direct conversations with decision makers.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <Link
                to={pricingTo}
                className="nth-cta-gradient group relative inline-flex items-center justify-center px-10 py-5 rounded-full bg-indigo-600 font-black text-base sm:text-lg uppercase tracking-widest overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_20px_50px_-15px_rgba(79,70,229,0.5)]"
              >
                <span className="relative z-10">Get Fast-Tracked</span>
                {/* Subtle internal glow on hover */}
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </motion.div>
        </div>
      </SectionContainer>
    </section>
  );
}
