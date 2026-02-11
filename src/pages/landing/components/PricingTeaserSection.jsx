import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import SectionContainer from '../../../components/SectionContainer';

const TIERS = [
  { name: 'Free', tagline: 'Get started with curated jobs.' },
  { name: 'Pro', tagline: 'More jobs and direct support.' },
  { name: 'Pro+', tagline: 'Full access and priority placement.' },
];

export default function PricingTeaserSection() {
  return (
    <section className="relative bg-white py-12 sm:py-16 md:py-20 lg:py-24">
      <SectionContainer useGrid>
        <motion.div
          className="col-span-full text-center mb-8 sm:mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-3 sm:mb-4">
            Choose your plan
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto px-2">
            Free, Pro, or Pro+—find the right fit for your career.
          </p>
        </motion.div>

        <motion.div
          className="col-span-full grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 text-center"
            >
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                {tier.name}
              </h3>
              <p className="text-sm text-slate-600">{tier.tagline}</p>
            </div>
          ))}
        </motion.div>

        <motion.div
          className="col-span-full text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link
            to="/pricing"
            className="nth-btn-primary inline-flex items-center justify-center gap-2 text-base sm:text-lg"
          >
            View all plans
            <svg
              className="w-5 h-5 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </motion.div>
      </SectionContainer>
    </section>
  );
}
