import { motion } from 'framer-motion';
import { HiBriefcase, HiUserGroup, HiSparkles } from 'react-icons/hi2';
import SectionContainer from '../../../components/SectionContainer';

const STEPS = [
  {
    title: 'Recruiters',
    description: 'Share verified job openings with the network.',
    icon: HiBriefcase,
    color: 'from-indigo-500 to-indigo-400',
  },
  {
    title: 'Client / Influencer',
    description: 'Curates and connects opportunities for followers.',
    icon: HiUserGroup,
    color: 'from-indigo-400 to-violet-400',
  },
  {
    title: 'Followers',
    description: 'Get opportunities on Instagram and in the app.',
    icon: HiSparkles,
    color: 'from-cyan-400 to-indigo-500',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 24, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative bg-white py-12 sm:py-16 md:py-20 lg:py-24 overflow-hidden">
      <SectionContainer useGrid>
        <motion.div
          className="col-span-full text-center mb-8 sm:mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight mb-3 sm:mb-4">
            How it works
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto px-2">
            From recruiters to you—verified jobs, one trusted path.
          </p>
        </motion.div>

        <motion.div
          className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 md:gap-12"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                variants={itemVariants}
                className="text-center"
              >
                <div
                  className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white mb-5 bg-gradient-to-br ${step.color} shadow-lg`}
                >
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">{step.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </SectionContainer>
    </section>
  );
}
