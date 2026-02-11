import { motion } from 'framer-motion';
import { SiShieldsdotio, SiGraphql, SiTarget } from 'react-icons/si';
import SectionContainer from '../../../components/SectionContainer';

const FEATURES = [
  {
    title: 'Verified Opportunities',
    description: 'Every job is vetted by real HR and recruiters. No spam, no fake listings—only genuine roles.',
    icon: SiShieldsdotio,
    color: 'from-indigo-500 to-indigo-400',
    bg: 'bg-indigo-50',
    shadow: 'shadow-indigo-500/20',
  },
  {
    title: 'Fresher to Senior',
    description: 'Roles for every stage—from your first internship to leadership positions. One platform for your entire career.',
    icon: SiGraphql,
    color: 'from-indigo-400 to-violet-400',
    bg: 'bg-violet-50',
    shadow: 'shadow-violet-500/20',
  },
  {
    title: 'Direct Recruiter Access',
    description: 'Connect directly with hiring teams. Get feedback, build your network, and accelerate your growth.',
    icon: SiTarget,
    color: 'from-cyan-400 to-indigo-500',
    bg: 'bg-cyan-50',
    shadow: 'shadow-cyan-500/20',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 50, damping: 20 },
  },
};

export default function ApplicationSection() {
  return (
    <motion.section
      id="app"
      className="relative bg-white py-12 sm:py-16 md:py-20 lg:py-24 overflow-hidden"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <SectionContainer useGrid>
        <motion.div
          className="col-span-full text-center max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 sm:mb-6 text-slate-900">
            Built for your{' '}
            <span
              className="text-transparent bg-clip-text"
              style={{
                backgroundImage: `linear-gradient(to right, rgb(var(--nth-primary)), rgb(var(--nth-primary-light)), rgb(var(--nth-accent)))`,
                WebkitBackgroundClip: 'text',
              }}
            >
              career journey
            </span>
          </h2>
          <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
            NTH brings verified jobs and real recruiters into one seamless ecosystem—so you can
            focus on growth, not guesswork.
          </p>
        </motion.div>

            <motion.div
              className="col-span-full grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16 md:mb-20"
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
                className="group relative p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl bg-white border border-slate-100 transition-all duration-300 hover:border-slate-200"
                style={{
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                }}
                whileHover={{
                  y: -8,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
                }}
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-white text-2xl shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 bg-gradient-to-br ${feature.color} ${feature.shadow}`}
                >
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          className="col-span-full text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <a
            href="/pricing"
            className="nth-btn-primary inline-flex items-center justify-center gap-2 text-base sm:text-lg"
          >
            View Plans & Get Started
            <svg
              className="w-5 h-5 ml-2 -mr-1 transition-transform group-hover:translate-x-1"
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
          </a>
        </motion.div>
      </SectionContainer>
    </motion.section>
  );
}
