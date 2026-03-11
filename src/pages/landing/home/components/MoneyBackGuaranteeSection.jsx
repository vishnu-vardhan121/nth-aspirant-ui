import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HiShieldCheck } from 'react-icons/hi2';
import SectionContainer from '../../../../components/SectionContainer';

const IMAGE_SRC = '/guarantee/landing-refund.webp';

export default function MoneyBackGuaranteeSection() {
  const [imageError, setImageError] = useState(false);

  return (
    <section
      id="money-back-guarantee"
      className="relative py-6 sm:py-7 md:py-10 overflow-hidden bg-[rgb(var(--nth-bg-light))]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_30%_50%,rgba(99,102,241,0.08)_0%,transparent_50%)] pointer-events-none" />

      <SectionContainer className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Content */}
          <motion.div
            className="order-2 lg:order-1 text-center lg:text-left"
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-6">
              <HiShieldCheck className="w-4 h-4" />
              100% money-back guaranteed
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.5rem] font-bold text-[rgb(var(--nth-text-primary-light))] tracking-tight leading-[1.15] mb-4">
              Can&apos;t schedule your interview?{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                Get every rupee back.
              </span>
            </h2>

            <p className="text-base sm:text-lg text-[rgb(var(--nth-text-secondary-light))] leading-relaxed max-w-xl mx-auto lg:mx-0 mb-8">
              After eligibility review and profile approval, if we fail to deliver — your entire service fee is refunded. No fine print, no hassle.
            </p>

            <Link
              to="/pricing?from=/"
              className="inline-flex items-center justify-center px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 font-bold text-base sm:text-lg text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              Claim Your Risk-Free Slot
            </Link>
          </motion.div>

          {/* Image - replace IMAGE_SRC with your final asset; placeholder shows if image fails to load */}
          <motion.div
            className="order-1 lg:order-2 relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-100 to-violet-100 min-h-[280px] sm:min-h-[320px] lg:min-h-[360px] shadow-xl flex items-center justify-center"
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {!imageError ? (
              <img
                src={IMAGE_SRC}
                alt="Risk-free interview slot — 100% money-back guarantee"
                className="w-full h-full object-cover absolute inset-0"
                onError={() => setImageError(true)}
              />
            ) : null}
            {imageError ? (
              <div className="text-center p-6">
                <HiShieldCheck className="w-16 h-16 text-indigo-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-indigo-700/80">Replace with your image</p>
                <p className="text-xs text-indigo-600/60 mt-1">public/guarantee/landing-refund.webp</p>
              </div>
            ) : null}
          </motion.div>
        </div>
      </SectionContainer>
    </section>
  );
}
