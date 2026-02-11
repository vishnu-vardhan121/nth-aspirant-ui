import { motion } from 'framer-motion';
import {
  HiShieldCheck,
  HiArrowTrendingUp,
  HiSparkles,
  HiUserGroup,
} from 'react-icons/hi2';
import SectionContainer from '../../../components/SectionContainer';

const TRUST_CARDS = [
  {
    title: 'Verified Recruiter Network',
    description:
      'Opportunities shared directly by trusted HRs and hiring partners.',
    icon: HiShieldCheck,
    gradient: 'from-indigo-500/30 to-cyan-400/30',
    border: 'border-indigo-500/30',
  },
  {
    title: 'Roles Across All Experience Levels',
    description:
      'From freshers to senior professionals, opportunities that grow with your career.',
    icon: HiArrowTrendingUp,
    gradient: 'from-indigo-400/30 to-indigo-500/30',
    border: 'border-indigo-400/30',
  },
  {
    title: 'Curated, Not Crowded',
    description: 'No spam. No fake listings. Only roles that matter.',
    icon: HiSparkles,
    gradient: 'from-violet-400/30 to-indigo-400/30',
    border: 'border-violet-400/30',
  },
  {
    title: 'Influencer-Led Trust',
    description:
      'Backed by a hiring influencer with a proven industry network.',
    icon: HiUserGroup,
    gradient: 'from-cyan-400/30 to-indigo-500/30',
    border: 'border-cyan-400/30',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { y: 40, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function TrustSection() {
  return (
    <section
      id="trust"
      className="relative bg-white py-12 sm:py-16 md:py-20 lg:py-24 overflow-hidden"
    >
      <SectionContainer useGrid>
        <motion.div
          className="col-span-full text-center mb-10 sm:mb-16 md:mb-20"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight mb-4 sm:mb-5">
            Why Professionals Trust NTH
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed px-2">
            Built on real recruiter networks, not fake listings or mass postings.
          </p>
        </motion.div>

        <motion.div
          className="col-span-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {TRUST_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                variants={itemVariants}
                className="relative"
              >
                <motion.div
                  className="relative h-full p-6 md:p-7 rounded-2xl border border-slate-200 bg-slate-50/50 shadow-sm"
                  whileHover={{
                    y: -6,
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)',
                    borderColor: 'rgb(226 232 240)',
                    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
                  }}
                >
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5 bg-gradient-to-br ${card.gradient} border ${card.border}`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">
                    {card.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                    {card.description}
                  </p>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>
      </SectionContainer>
    </section>
  );
}
