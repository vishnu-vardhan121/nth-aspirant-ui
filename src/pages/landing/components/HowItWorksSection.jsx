import { motion } from 'framer-motion';
import { HiBriefcase, HiUserGroup, HiSparkles } from 'react-icons/hi2';
import SectionContainer from '../../../components/SectionContainer';

const STEPS = [
  {
    title: 'Recruiters Post',
    description: 'Verified HR professionals and recruiters post genuine openings directly to the platform.',
    icon: HiBriefcase,
    color: 'from-blue-500 to-indigo-600',
    shadow: 'shadow-blue-500/30',
  },
  {
    title: 'Influencers Curate',
    description: 'Trusted industry voices and hiring influencers vet and highlight the best opportunities.',
    icon: HiUserGroup,
    color: 'from-indigo-500 to-purple-600',
    shadow: 'shadow-indigo-500/30',
  },
  {
    title: 'You Get Hired',
    description: 'Apply to verified roles with confidence and track your application status in real-time.',
    icon: HiSparkles,
    color: 'from-purple-500 to-pink-600',
    shadow: 'shadow-purple-500/30',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.3 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative bg-[rgb(var(--nth-bg-soft))] py-20 sm:py-28 overflow-hidden">
      <SectionContainer>
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16 sm:mb-24"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[rgb(var(--nth-text-primary-light))] tracking-tight mb-6">
            Simplified Hiring Flow
          </h2>
          <p className="text-lg sm:text-xl text-[rgb(var(--nth-text-secondary-light))] leading-relaxed">
            We've removed the noise. Here's how certified jobs travel from the source directly to you.
          </p>
        </motion.div>

        <div className="relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-slate-300 to-transparent dashed-line" />

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  variants={itemVariants}
                  className="relative flex flex-col items-center text-center group"
                >
                  <div className="relative z-10 mb-8">
                    <div
                      className={`w-24 h-24 rounded-3xl flex items-center justify-center text-white bg-gradient-to-br ${step.color} ${step.shadow} shadow-xl transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}
                    >
                      <Icon className="w-10 h-10" />
                    </div>
                    {/* Step Number Badge */}
                    <div className="absolute -bottom-3 -right-3 w-8 h-8 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center font-bold text-slate-400 shadow-sm text-sm">
                      {index + 1}
                    </div>
                  </div>

                  <h3 className="text-2xl font-bold text-[rgb(var(--nth-text-primary-light))] mb-4">
                    {step.title}
                  </h3>
                  <p className="text-base text-[rgb(var(--nth-text-secondary-light))] leading-relaxed max-w-xs mx-auto">
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </SectionContainer>
    </section>
  );
}
