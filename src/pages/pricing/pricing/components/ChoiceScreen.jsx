import { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';
import { HiArrowRight } from 'react-icons/hi2';
import PricingInterviewsMarquee from './PricingInterviewsMarquee';
import {
  SiReact,
  SiJavascript,
  SiTypescript,
  SiNodedotjs,
  SiPython,
  SiDjango,
  SiFastapi,
  SiAmazonwebservices,
  SiDocker,
  SiKubernetes,
  SiVuedotjs,
  SiNextdotjs,
  SiVite,
  SiTailwindcss,
  SiGraphql,
  SiMongodb,
  SiPostgresql,
  SiRedis,
  SiGo,
  SiRust,
  SiFirebase,
  SiVercel,
  SiSupabase,
  SiGithub,
  SiFigma,
  SiTensorflow,
} from 'react-icons/si';

const TECH_ICONS = [
  { Icon: SiReact, color: '#61DAFB', delay: 0, duration: 25, x: '8%', y: '18%' },
  { Icon: SiJavascript, color: '#F7DF1E', delay: 2, duration: 28, x: '85%', y: '22%' },
  { Icon: SiTypescript, color: '#3178C6', delay: 4, duration: 24, x: '92%', y: '38%' },
  { Icon: SiNodedotjs, color: '#339933', delay: 1, duration: 30, x: '12%', y: '72%' },
  { Icon: SiPython, color: '#3776AB', delay: 3, duration: 26, x: '78%', y: '68%' },
  { Icon: SiDjango, color: '#092E20', delay: 5, duration: 29, x: '22%', y: '35%' },
  { Icon: SiFastapi, color: '#009688', delay: 2, duration: 27, x: '18%', y: '55%' },
  { Icon: SiAmazonwebservices, color: '#FF9900', delay: 6, duration: 32, x: '72%', y: '45%' },
  { Icon: SiDocker, color: '#2496ED', delay: 4, duration: 31, x: '88%', y: '78%' },
  { Icon: SiKubernetes, color: '#326CE5', delay: 1, duration: 33, x: '5%', y: '52%' },
  { Icon: SiVuedotjs, color: '#4FC08D', delay: 3, duration: 26, x: '75%', y: '18%' },
  { Icon: SiNextdotjs, color: '#ffffff', delay: 5, duration: 28, x: '6%', y: '32%' },
  { Icon: SiVite, color: '#646CFF', delay: 2, duration: 25, x: '82%', y: '58%' },
  { Icon: SiTailwindcss, color: '#06B6D4', delay: 4, duration: 29, x: '25%', y: '78%' },
  { Icon: SiGraphql, color: '#E10098', delay: 1, duration: 30, x: '68%', y: '82%' },
  { Icon: SiMongodb, color: '#47A248', delay: 6, duration: 27, x: '38%', y: '22%' },
  { Icon: SiPostgresql, color: '#4169E1', delay: 2, duration: 28, x: '55%', y: '72%' },
  { Icon: SiRedis, color: '#DC382D', delay: 4, duration: 26, x: '42%', y: '48%' },
  { Icon: SiGo, color: '#00ADD8', delay: 3, duration: 29, x: '58%', y: '28%' },
  { Icon: SiRust, color: '#ffffff', delay: 5, duration: 27, x: '15%', y: '88%' },
  { Icon: SiFirebase, color: '#FFCA28', delay: 1, duration: 31, x: '88%', y: '42%' },
  { Icon: SiVercel, color: '#ffffff', delay: 4, duration: 26, x: '48%', y: '62%' },
  { Icon: SiSupabase, color: '#3ECF8E', delay: 2, duration: 28, x: '32%', y: '42%' },
  { Icon: SiGithub, color: '#ffffff', delay: 5, duration: 30, x: '65%', y: '12%' },
  { Icon: SiFigma, color: '#F24E1E', delay: 3, duration: 25, x: '8%', y: '62%' },
  { Icon: SiTensorflow, color: '#FF6F00', delay: 1, duration: 32, x: '92%', y: '88%' },
];

const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 2 + Math.random() * 3,
  duration: 15 + Math.random() * 20,
}));

function TechIcon({ Icon, color, delay, duration, x, y, mouseX, mouseY }) {
  const xSpring = useSpring(0, { stiffness: 40, damping: 25 });
  const ySpring = useSpring(0, { stiffness: 40, damping: 25 });

  useEffect(() => {
    const unsubscribeX = mouseX.on('change', (latest) => {
      xSpring.set((latest - window.innerWidth / 2) * 0.012);
    });
    const unsubscribeY = mouseY.on('change', (latest) => {
      ySpring.set((latest - window.innerHeight / 2) * 0.012);
    });
    return () => {
      unsubscribeX();
      unsubscribeY();
    };
  }, [mouseX, mouseY, xSpring, ySpring]);

  return (
    <motion.div
      className="absolute flex items-center justify-center pointer-events-none"
      style={{ left: x, top: y, x: xSpring, y: ySpring }}
      animate={{ opacity: [0.1, 0.15, 0.1], scale: [1, 1.05, 1] }}
      transition={{ duration: duration, repeat: Infinity, ease: 'easeInOut', delay: delay }}
    >
      <Icon className="w-10 h-10 md:w-16 md:h-16 grayscale" style={{ color }} />
    </motion.div>
  );
}


export default function ChoiceScreen({ onSelect }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = ({ clientX, clientY }) => {
    mouseX.set(clientX);
    mouseY.set(clientY);
  };

  return (
    <div
      className="flex flex-col items-center justify-center flex-1 min-h-0 w-full px-4 min-[400px]:px-5 sm:px-6 md:px-8 lg:px-10 py-6 relative overflow-hidden bg-slate-950 select-none pb-20 sm:pb-24"
      onMouseMove={handleMouseMove}
    >
      {/* Clean Premium Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-50">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      </div>

      {/* Background Icons */}
      <div className="absolute inset-0 z-0">
        {TECH_ICONS.map((icon, idx) => (
          <TechIcon key={idx} {...icon} mouseX={mouseX} mouseY={mouseY} />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-4xl mx-auto sm:px-2">
        {/* Professional Header */}
        <motion.header
          className="relative text-center w-full mb-12 sm:mb-16 px-6 pt-10"
          initial={{ opacity: 0, scale: 0.98, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 shadow-sm backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">Choose Your Path</span>
          </div>

          <h1 className="text-[clamp(2rem,6vw,4rem)] font-extrabold text-white tracking-tight leading-[1.05] mb-6 max-w-3xl mx-auto">
            Take personal <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">profile marketing</span>
          </h1>
          
          <p className="text-slate-400 text-base sm:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            We take care of your profile personally-for tech guidance and interviews.
          </p>
        </motion.header>

        {/* Choice Buttons */}
        <div className="w-full flex flex-col items-center mb-16 relative z-20">
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 w-full max-w-3xl justify-center px-4">
            {[
              { id: 'fresher', label: 'Fresher' },
              { id: 'experienced', label: 'Experienced' }
            ].map((track, i) => (
              <motion.button
                key={track.id}
                onClick={() => onSelect(track.id)}
                whileHover={{ y: -3, scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i, duration: 0.3, ease: 'easeOut' }}
                className="group flex items-center justify-center gap-3 px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all duration-300 hover:shadow-[0_0_35px_rgba(79,70,229,0.5)] w-full sm:w-auto min-w-[240px]"
              >
                <span className="text-[20px] font-extrabold tracking-wide">
                  {track.label}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        <PricingInterviewsMarquee className="w-full text-left pt-8 shrink-0 border-t border-white/5 relative z-10" />
      </div>
    </div>
  );
}
