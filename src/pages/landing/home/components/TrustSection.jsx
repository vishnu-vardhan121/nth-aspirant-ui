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
    gradient: 'from-indigo-500 to-sky-500',
    border: 'group-hover:border-indigo-400',
  },
  {
    title: 'Roles Across All Levels',
    description:
      'From freshers to senior professionals, opportunities that grow with your career.',
    icon: HiArrowTrendingUp,
    gradient: 'from-indigo-500 to-violet-500',
    border: 'group-hover:border-indigo-400',
  },
  {
    title: 'Curated, Not Crowded',
    description: 'No spam. No fake listings. Only roles that matter.',
    icon: HiSparkles,
    gradient: 'from-violet-500 to-indigo-500',
    border: 'group-hover:border-violet-400',
  },
  {
    title: 'Influencer-Led Trust',
    description:
      'Backed by a hiring influencer with a proven industry network.',
    icon: HiUserGroup,
    gradient: 'from-violet-500 to-sky-500',
    border: 'group-hover:border-violet-400',
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
      className="relative bg-white py-12 sm:py-14 md:py-16 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-50 via-white to-white pointer-events-none" />
      
      <SectionContainer>
        <motion.div
          className="text-center mb-8 sm:mb-10 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[rgb(var(--nth-text-primary-light))] tracking-tight mb-4">
            Why Professionals Trust Naveen Talent Hub
          </h2>
          <p className="text-lg sm:text-xl text-[rgb(var(--nth-text-secondary-light))] leading-relaxed max-w-2xl mx-auto">
            Built on real recruiter networks, not fake listings or mass postings.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
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
                className={`group relative p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${card.border}`}
              >
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 bg-gradient-to-br ${card.gradient} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                
                <h3 className="text-lg font-bold text-[rgb(var(--nth-text-primary-light))] mb-2">
                  {card.title}
                </h3>
                <p className="text-sm text-[rgb(var(--nth-text-secondary-light))] leading-relaxed">
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
