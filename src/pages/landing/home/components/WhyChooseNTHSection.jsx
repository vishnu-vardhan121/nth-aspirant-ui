import { motion } from 'framer-motion';
import { HiBuildingOffice2, HiShieldCheck, HiCalendarDays, HiAcademicCap } from 'react-icons/hi2';
import SectionContainer from '../../../../components/SectionContainer';

const CARDS = [
  {
    image: '/why-choose-nth/why-direct-tieups.webp',
    icon: HiBuildingOffice2,
    title: 'Direct Company Tie-Ups',
    description: 'We work directly with hiring team leads - no middlemen, no delays.',
  },
  {
    image: '/why-choose-nth/why-no-fake-listings.webp',
    icon: HiShieldCheck,
    title: 'No Fake Listings',
    description: 'Only real openings, shared by verified recruiters from trusted companies.',
  },
  {
    image: '/why-choose-nth/why-interview-scheduling.webp',
    icon: HiCalendarDays,
    title: 'Interview Scheduling Support',
    description: 'Preparation materials + guidance before every interview round.',
  },
  {
    image: '/why-choose-nth/why-tech-support.webp',
    icon: HiAcademicCap,
    title: 'Dedicated Technical Support',
    description: 'Mock interviews, resume reviews, and communication guidance.',
  },
];

export default function WhyChooseNTHSection() {
  return (
    <section id="why-choose-nth" className="scroll-mt-24 nth-section-y-compact bg-slate-50/80 border-t border-slate-100">
      <SectionContainer>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-[rgb(var(--nth-text-primary-light))] mb-7 sm:mb-9 tracking-tight"
        >
          Why Choose <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-violet-600">Naveen Talent Hub?</span>
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          {CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.08 }}
                className="nth-card overflow-hidden group rounded-xl border border-slate-200 bg-white transition-[box-shadow,border-color] duration-200 hover:shadow-lg hover:border-slate-300/80"
              >
                <div className="aspect-16/10 sm:h-40 sm:aspect-auto md:h-44 overflow-hidden">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-white" />
                    </div>
                    <h3 className="font-bold text-[rgb(var(--nth-text-primary-light))] text-sm sm:text-base leading-snug">
                      {card.title}
                    </h3>
                  </div>
                  <p className="text-sm text-[rgb(var(--nth-text-secondary-light))] leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </SectionContainer>
    </section>
  );
}
