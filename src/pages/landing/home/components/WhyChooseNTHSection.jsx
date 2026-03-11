import { motion } from 'framer-motion';
import { HiBuildingOffice2, HiShieldCheck, HiCalendarDays, HiAcademicCap } from 'react-icons/hi2';
import SectionContainer from '../../../../components/SectionContainer';

const CARDS = [
  {
    image: '/why-choose-nth/why-direct-tieups.jpg',
    icon: HiBuildingOffice2,
    title: 'Direct Company Tie-Ups',
    description: 'We work directly with hiring team leads — no middlemen, no delays.',
  },
  {
    image: '/why-choose-nth/why-no-fake-listings.jpg',
    icon: HiShieldCheck,
    title: 'No Fake Listings',
    description: 'Only real openings, shared by verified recruiters from trusted companies.',
  },
  {
    image: '/why-choose-nth/why-interview-scheduling.jpg',
    icon: HiCalendarDays,
    title: 'Interview Scheduling Support',
    description: 'Preparation materials + guidance before every interview round.',
  },
  {
    image: '/why-choose-nth/why-tech-support.jpg',
    icon: HiAcademicCap,
    title: 'Dedicated Technical Support',
    description: 'Mock interviews, resume reviews, and communication guidance.',
  },
];

export default function WhyChooseNTHSection() {
  return (
    <section id="why-choose-nth" className="py-5 sm:py-7 md:py-14 bg-white">
      <SectionContainer>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-[rgb(var(--nth-text-primary-light))] mb-6 sm:mb-8"
        >
          Why Choose <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Naveen Talent Hub?</span>
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.08 }}
                className="nth-card overflow-hidden group hover:nth-shadow transition-shadow duration-300 rounded-xl border border-slate-200 bg-white"
              >
                <div className="h-36 sm:h-40 md:h-44 overflow-hidden">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    </div>
                    <h3 className="font-bold text-[rgb(var(--nth-text-primary-light))] text-xs sm:text-sm leading-tight">
                      {card.title}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-[rgb(var(--nth-text-secondary-light))] leading-snug">
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
