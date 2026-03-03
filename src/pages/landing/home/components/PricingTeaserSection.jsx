import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import SectionContainer from '../../../../components/SectionContainer';

const TIERS = [
  { name: 'Free', tagline: 'For freshers starting out.', price: '₹0' },
  { name: 'Pro', tagline: 'For serious job seekers.', price: '₹499', popular: true },
  { name: 'Pro+', tagline: 'For career acceleration.', price: '₹1,499' },
];

export default function PricingTeaserSection() {
  const location = useLocation();
  const pricingTo = `/pricing?from=${encodeURIComponent(location.pathname || '/')}`;

  return (
    <section className="relative bg-white py-20 sm:py-28">
      <SectionContainer>
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[rgb(var(--nth-text-primary-light))] tracking-tight mb-4">
            Transparent Pricing
          </h2>
          <p className="text-lg text-[rgb(var(--nth-text-secondary-light))] max-w-xl mx-auto">
            Invest in your career with plans designed for every stage of your journey.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`p-8 rounded-3xl border transition-all duration-300 ${
                tier.popular
                  ? 'border-[hsl(var(--nth-primary))] bg-[rgb(var(--nth-bg-soft))] shadow-lg scale-105 z-10'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <h3 className="text-lg font-semibold text-[rgb(var(--nth-text-secondary-light))] mb-2">
                {tier.name}
              </h3>
              <div className="text-3xl font-bold text-[rgb(var(--nth-text-primary-light))] mb-1">
                {tier.price}
                <span className="text-base font-normal text-slate-400">/mo</span>
              </div>
              <p className="text-sm text-slate-500">{tier.tagline}</p>
            </div>
          ))}
        </motion.div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link
            to={pricingTo}
            className="nth-btn-primary inline-flex items-center justify-center gap-2 text-lg px-8 py-3 hover:text-white"
          >
            Compare Plans
          </Link>
        </motion.div>
      </SectionContainer>
    </section>
  );
}
