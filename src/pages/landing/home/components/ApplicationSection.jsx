import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { SiShieldsdotio, SiGraphql, SiTarget } from 'react-icons/si';
import SectionContainer from '../../../../components/SectionContainer';

const FEATURES = [
  {
    title: 'Verified Opportunities',
    description: 'Every job is vetted by real HR and recruiters. No spam, no fake listings—only genuine roles.',
    icon: SiShieldsdotio,
    color: 'from-indigo-500 to-sky-500',
    shadow: 'shadow-indigo-500/20',
  },
  {
    title: 'Fresher to Senior',
    description: 'Roles for every stage—from your first internship to leadership positions. One platform for your entire career.',
    icon: SiGraphql,
    color: 'from-indigo-500 to-violet-500',
    shadow: 'shadow-indigo-500/20',
  },
  {
    title: 'Direct Recruiter Access',
    description: 'Connect directly with hiring teams. Get feedback, build your network, and accelerate your growth.',
    icon: SiTarget,
    color: 'from-violet-500 to-indigo-500',
    shadow: 'shadow-violet-500/20',
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
      className="relative nth-section-y-compact overflow-hidden border-t border-slate-100"
    >
      {/* Full-width professional briefcase background */}
      <div
        className="absolute inset-0 w-full bg-cover bg-center bg-no-repeat pointer-events-none bg-[url('/hero-section/job-application-bg.jpg')]"
      />
      <div
        className="absolute inset-0 w-full bg-gradient-to-br from-white/75 via-white/60 to-slate-50/85 pointer-events-none"
        aria-hidden
      />
      <SectionContainer className="relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-14 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-5 text-[rgb(var(--nth-text-primary-light))] leading-[1.2]">
              Built for your{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--nth-primary))] to-[hsl(var(--nth-accent))]">
                career journey
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-[rgb(var(--nth-text-secondary-light))] leading-relaxed mb-6">
              Naveen Talent Hub brings verified jobs and real recruiters into one seamless
              ecosystem, so you can focus on growth, not guesswork.
            </p>
            
            <Link
              to={pricingTo}
              className="nth-btn-primary cursor-pointer inline-flex items-center justify-center gap-3 text-lg group hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <span className="inline-flex items-center justify-center gap-3">
                View Plans & Get Started
              </span>
            </Link>
          </motion.div>

          <motion.div
            className="grid gap-4"
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
                  className="flex items-start gap-4 p-5 rounded-xl bg-white/95 backdrop-blur-sm shadow-sm border border-slate-200/90 hover:shadow-md hover:border-slate-300/90 transition-[box-shadow,border-color] duration-200 cursor-default"
                >
                  <div
                    className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${feature.color} ${feature.shadow} shadow-lg`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[rgb(var(--nth-text-primary-light))] mb-1.5">
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
