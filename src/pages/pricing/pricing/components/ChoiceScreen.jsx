import { useRef, useState, useEffect } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';
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
  const xSpring = useSpring(0, { stiffness: 50, damping: 20 });
  const ySpring = useSpring(0, { stiffness: 50, damping: 20 });

  useEffect(() => {
    // Parallax effect heavily dampened
    const unsubscribeX = mouseX.on('change', (latest) => {
      xSpring.set((latest - window.innerWidth / 2) * 0.02);
    });
    const unsubscribeY = mouseY.on('change', (latest) => {
      ySpring.set((latest - window.innerHeight / 2) * 0.02);
    });
    return () => {
      unsubscribeX();
      unsubscribeY();
    };
  }, [mouseX, mouseY, xSpring, ySpring]);

  return (
    <motion.div
      className="absolute flex items-center justify-center group pointer-events-auto cursor-pointer"
      style={{ left: x, top: y, x: xSpring, y: ySpring }}
      animate={{
        y: [0, -20, 0],
      }}
      transition={{
        duration: duration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: delay,
      }}
      whileHover={{ scale: 1.2, rotate: 10, zIndex: 50 }}
    >
      <Icon 
        className="w-10 h-10 md:w-14 md:h-14 transition-all duration-300 opacity-40 grayscale group-hover:opacity-100 group-hover:grayscale-0 group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" 
        style={{ color }}
      />
      <span 
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-mono text-white bg-slate-900/80 px-2 py-1 rounded whitespace-nowrap pointer-events-none"
        style={{ color }}
      >
        {Icon.name.replace('Si', '')}
      </span>
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
      className="flex flex-col items-center justify-center flex-1 px-6 relative overflow-hidden" // Added relative overflow-hidden
      onMouseMove={handleMouseMove}
    >
      {/* Animated Background Layers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-[rgb(var(--nth-primary)/0.15)] rounded-full blur-[120px]"
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3], 
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[rgb(var(--nth-accent)/0.1)] rounded-full blur-[100px]"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2], 
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </div>

      <div className="absolute inset-0 pointer-events-none">
        {PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-white/20"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: 'linear',
              delay: Math.random() * -20,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 z-0 text-slate-500">
        {TECH_ICONS.map((icon, idx) => (
          <TechIcon key={idx} {...icon} mouseX={mouseX} mouseY={mouseY} />
        ))}
      </div>

      {/* Main Content - Raised z-index */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.h1
          className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          Choose your track
        </motion.h1>
        <motion.p
          className="text-slate-400 mb-8 text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          Who is this for?
        </motion.p>
        <div className="flex flex-col sm:flex-row gap-4">
          <motion.button
            type="button"
            onClick={() => onSelect('fresher')}
            className="px-10 py-4 rounded-xl font-semibold text-white text-lg min-w-[180px] transition-all relative overflow-hidden group"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--nth-primary)) 0%, rgb(var(--nth-primary-light)) 100%)',
              boxShadow: '0 4px 24px rgb(var(--nth-primary) / 0.35)',
            }}
            whileHover={{ scale: 1.02, boxShadow: '0 8px 32px rgb(var(--nth-primary) / 0.45)' }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <span className="relative z-10">Fresher</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </motion.button>
          <motion.button
            type="button"
            onClick={() => onSelect('experienced')}
            className="px-10 py-4 rounded-xl font-semibold text-lg min-w-[180px] transition-all relative overflow-hidden group text-white"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--nth-violet)) 0%, rgb(79, 70, 229) 100%)', // Indigo-600 end
              boxShadow: '0 4px 24px rgba(124, 58, 237, 0.35)', // Violet shadow
            }}
            whileHover={{ scale: 1.02, boxShadow: '0 8px 32px rgba(124, 58, 237, 0.45)' }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <span className="relative z-10">Experienced</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
