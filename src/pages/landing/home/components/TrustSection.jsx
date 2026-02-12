import { motion } from 'framer-motion';
import {
  HiShieldCheck,
  HiArrowTrendingUp,
  HiSparkles,
  HiUserGroup,
} from 'react-icons/hi2';
import SectionContainer from '../../../../components/SectionContainer';

const TRUST_CARDS = [
  {
    title: 'Verified Recruiter Network',
    description:
      'Opportunities shared directly by trusted HRs and hiring partners.',
    icon: HiShieldCheck,
    gradient: 'from-blue-500 to-cyan-400',
    border: 'group-hover:border-blue-400',
  },
  {
    title: 'Roles Across All Levels',
    description:
      'From freshers to senior professionals, opportunities that grow with your career.',
    icon: HiArrowTrendingUp,
    gradient: 'from-indigo-500 to-purple-500',
    border: 'group-hover:indigo-400',
  },
  {
    title: 'Curated, Not Crowded',
    description: 'No spam. No fake listings. Only roles that matter.',
    icon: HiSparkles,
    gradient: 'from-purple-500 to-pink-500',
    border: 'group-hover:purple-400',
  },
  {
    title: 'Influencer-Led Trust',
    description:
      'Backed by a hiring influencer with a proven industry network.',
    icon: HiUserGroup,
    gradient: 'from-pink-500 to-rose-500',
    border: 'group-hover:pink-400',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: 'backOut' },
  },
};

export default function TrustSection() {
  return (
    <section
      id="trust"
      className="relative bg-white py-20 sm:py-28 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-50 via-white to-white pointer-events-none" />
      
      <SectionContainer>
        <motion.div
          className="text-center mb-16 sm:mb-20 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[rgb(var(--nth-text-primary-light))] tracking-tight mb-6">
            Why Professionals Trust NTH
          </h2>
          <p className="text-lg sm:text-xl text-[rgb(var(--nth-text-secondary-light))] leading-relaxed max-w-2xl mx-auto">
            Built on real recruiter networks, not fake listings or mass postings.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {TRUST_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                variants={itemVariants}
                className={`group relative p-8 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${card.border}`}
              >
                <div
                  className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6 bg-gradient-to-br ${card.gradient} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-7 h-7" />
                </div>
                
                <h3 className="text-xl font-bold text-[rgb(var(--nth-text-primary-light))] mb-3">
                  {card.title}
                </h3>
                <p className="text-[rgb(var(--nth-text-secondary-light))] leading-relaxed">
                  {card.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </SectionContainer>
    </section>
  );
}
