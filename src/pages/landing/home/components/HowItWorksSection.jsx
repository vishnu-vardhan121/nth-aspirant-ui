import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Users, Code, Calendar, Briefcase, Award } from 'lucide-react';
import SectionContainer from '../../../../components/SectionContainer';

const STEPS = [
  {
    step: '1',
    title: 'Profile Screening',
    description: 'We review your profile and experience to match you with the right opportunities.',
    icon: Search,
  },
  {
    step: '2',
    title: 'Mock Interviews',
    description: 'Practice with industry experts to sharpen your interview skills.',
    icon: Users,
  },
  {
    step: '3',
    title: 'Technical Support',
    description: 'Get technical guidance and preparation tailored to your role.',
    icon: Code,
  },
  {
    step: '4',
    title: 'Interview Scheduling',
    description: 'We handle the logistics and seamlessly schedule your interviews.',
    icon: Calendar,
  },
  {
    step: '5',
    title: 'Company Round',
    description: 'Direct coordination with partner companies for technical rounds.',
    icon: Briefcase,
  },
  {
    step: '6',
    title: 'Offer Letter',
    description: 'Celebrate your success as you receive your official offer letter.',
    icon: Award,
  },
];

export default function HowItWorksSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % STEPS.length);
    }, 2000); // changes every 2 seconds
    return () => clearInterval(interval);
  }, [isHovered]);

  return (
    <section id="how-it-works" className="scroll-mt-24 nth-section-y-compact bg-white relative overflow-hidden border-t border-slate-100">
      <SectionContainer>
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 tracking-tight"
          >
            Our Direct Hiring Process
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto"
          >
            A clear, transparent, and proven path from your application to your offer letter.
          </motion.p>
        </div>

        {/* Desktop: Horizontal single-line timeline */}
        <div className="hidden lg:block relative w-full pt-2 pb-8">
          {/* Base Connector Line */}
          <div className="absolute top-[3.25rem] left-[8%] right-[8%] h-[2px] bg-slate-200" />
          
          {/* Animated Glow Line Container */}
          <div className="absolute top-[3.25rem] left-[8%] right-[8%] h-[2px]">
            {/* Animated Glow Line Fill */}
            <div 
              className={`absolute left-0 top-0 h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] ${activeIndex === 0 ? 'transition-none' : 'transition-all ease-linear duration-[2000ms]'}`}
              style={{ width: `${(activeIndex / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
          
          <div className="flex justify-between items-start relative z-10 w-full"
               onMouseEnter={() => setIsHovered(true)}
               onMouseLeave={() => setIsHovered(false)}>
            {STEPS.map((step, index) => {
              const isActive = index === activeIndex;
              const isPast = index <= activeIndex;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex-1 flex flex-col items-center px-4 cursor-pointer"
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  {/* Step Node */}
                  <div className={`w-[4.5rem] h-[4.5rem] bg-white rounded-full border-2 flex items-center justify-center mb-6 relative transition-all duration-500 ease-out
                    ${isActive ? 'border-indigo-600 ring-4 ring-indigo-500/25 shadow-[0_10px_25px_-5px_rgba(79,70,229,0.35)]' : 
                      isPast ? 'border-indigo-400 shadow-[0_0_0_8px_white]' : 'border-slate-200 shadow-[0_0_0_8px_white]'}`}>
                    <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-500
                      ${isPast ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {step.step}
                    </div>
                    <step.icon className={`w-6 h-6 transition-colors duration-500 ${isPast ? 'text-indigo-600' : 'text-slate-400'}`} />
                  </div>
                  
                  {/* Content */}
                  <h3 className={`text-base font-bold mb-2 text-center transition-colors duration-500 ${isActive ? 'text-indigo-600' : isPast ? 'text-slate-800' : 'text-slate-400'}`}>
                    {step.title}
                  </h3>
                  <p className={`text-sm text-center leading-relaxed transition-colors duration-500 ${isPast ? 'text-slate-600' : 'text-slate-400'}`}>
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Tablet: 3x2 Grid */}
        <div className="hidden md:block lg:hidden"
             onMouseEnter={() => setIsHovered(true)}
             onMouseLeave={() => setIsHovered(false)}>
          <div className="grid grid-cols-3 gap-y-12 gap-x-6">
            {STEPS.map((step, index) => {
              const isActive = index === activeIndex;
              const isPast = index <= activeIndex;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex flex-col items-center px-4 cursor-pointer"
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <div className={`w-16 h-16 bg-white rounded-full flex items-center justify-center mb-5 relative transition-all duration-500 ease-out border
                    ${isActive ? 'border-indigo-600 ring-4 ring-indigo-500/25 shadow-[0_10px_25px_-5px_rgba(79,70,229,0.2)]' : 
                      isPast ? 'border-indigo-400 shadow-sm' : 'border-slate-200 shadow-sm'}`}>
                    <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-500
                      ${isPast ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {step.step}
                    </div>
                    <step.icon className={`w-6 h-6 transition-colors duration-500 ${isPast ? 'text-indigo-600' : 'text-slate-400'}`} />
                  </div>
                  <h3 className={`text-center font-bold text-base mb-2 transition-colors duration-500 ${isActive ? 'text-indigo-600' : isPast ? 'text-slate-800' : 'text-slate-400'}`}>
                    {step.title}
                  </h3>
                  <p className={`text-center text-sm leading-relaxed transition-colors duration-500 ${isPast ? 'text-slate-600' : 'text-slate-400'}`}>{step.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mobile: Vertical Timeline */}
        <div className="md:hidden max-w-sm mx-auto"
             onMouseEnter={() => setIsHovered(true)}
             onMouseLeave={() => setIsHovered(false)}
             onTouchStart={() => setIsHovered(true)}
             onTouchEnd={() => setIsHovered(false)}>
          <div className="relative border-l-2 border-slate-200 ml-4 py-2 space-y-10">
            {/* Animated Glow Vertical Fill */}
            <div 
              className={`absolute left-[-2px] top-0 w-[2px] bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] ${activeIndex === 0 ? 'transition-none' : 'transition-all ease-linear duration-[2000ms]'}`}
              style={{ height: `${(activeIndex / (STEPS.length - 1)) * 100}%` }}
            />
            
            {STEPS.map((step, index) => {
              const isActive = index === activeIndex;
              const isPast = index <= activeIndex;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="relative pl-8 cursor-pointer"
                  onClick={() => setActiveIndex(index)}
                >
                  {/* Node */}
                  <span className={`absolute -left-[17px] top-1 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ease-out
                    ${isActive ? 'bg-indigo-600 border-2 border-indigo-600 ring-2 ring-white/70 shadow-md shadow-indigo-500/30' : 
                      isPast ? 'bg-indigo-50 border-2 border-indigo-400' : 'bg-white border-2 border-slate-300'}`}>
                    <span className={`font-bold text-xs transition-colors duration-500 ${isActive ? 'text-white' : isPast ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {step.step}
                    </span>
                  </span>
                  
                  {/* Content */}
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-500
                        ${isActive ? 'bg-indigo-100' : isPast ? 'bg-indigo-50' : 'bg-slate-50'}`}>
                        <step.icon className={`w-4 h-4 transition-colors duration-500 ${isActive ? 'text-indigo-600' : isPast ? 'text-indigo-500' : 'text-slate-400'}`} />
                      </div>
                      <h3 className={`font-bold text-base transition-colors duration-500 ${isActive ? 'text-indigo-600' : isPast ? 'text-slate-800' : 'text-slate-400'}`}>
                        {step.title}
                      </h3>
                    </div>
                    <p className={`text-sm leading-relaxed ml-11 transition-colors duration-500 ${isPast ? 'text-slate-600' : 'text-slate-400'}`}>{step.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
