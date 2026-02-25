import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { SiShieldsdotio, SiGraphql, SiTarget } from 'react-icons/si';
import SectionContainer from '../../../../components/SectionContainer';

const FEATURES = [
  {
    title: 'Verified Opportunities',
    description: 'Every job is vetted by real HR and recruiters. No spam, no fake listings—only genuine roles.',
    icon: SiShieldsdotio,
    color: 'from-blue-500 to-cyan-400',
    shadow: 'shadow-blue-500/20',
  },
  {
    title: 'Fresher to Senior',
    description: 'Roles for every stage—from your first internship to leadership positions. One platform for your entire career.',
    icon: SiGraphql,
    color: 'from-indigo-500 to-purple-500',
    shadow: 'shadow-indigo-500/20',
  },
  {
    title: 'Direct Recruiter Access',
    description: 'Connect directly with hiring teams. Get feedback, build your network, and accelerate your growth.',
    icon: SiTarget,
    color: 'from-purple-500 to-pink-500',
    shadow: 'shadow-purple-500/20',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function ApplicationSection() {
  const location = useLocation();
  const pricingTo = `/pricing?from=${encodeURIComponent(location.pathname || '/')}`;
  return (
    <section
      id="app"
      className="relative bg-[rgb(var(--nth-bg-soft))] py-20 sm:py-28 overflow-hidden"
    >
      <SectionContainer>
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center mb-20 lg:mb-0">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-8 text-[rgb(var(--nth-text-primary-light))] leading-[1.2]">
              Built for your{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[rgb(var(--nth-primary))] to-[rgb(var(--nth-accent))]">
                career journey
              </span>
            </h2>
            <p className="text-xl text-[rgb(var(--nth-text-secondary-light))] leading-relaxed mb-10">
              NTH brings verified jobs and real recruiters into one seamless ecosystem—so you can
              focus on growth, not guesswork.
            </p>
            
            <Link
              to={pricingTo}
              className="nth-btn-primary inline-flex items-center justify-center gap-3 text-lg group hover:text-white"
            >
              <motion.span
                className="inline-flex items-center justify-center gap-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                View Plans & Get Started
                <svg
                  className="w-5 h-5 transition-transform group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </motion.span>
            </Link>
          </motion.div>

          <motion.div
            className="grid gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  variants={itemVariants}
                  className="flex items-start gap-6 p-6 rounded-2xl bg-white shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div
                    className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br ${feature.color} ${feature.shadow} shadow-lg`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[rgb(var(--nth-text-primary-light))] mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-[rgb(var(--nth-text-secondary-light))] leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </SectionContainer>
    </section>
  );
}
