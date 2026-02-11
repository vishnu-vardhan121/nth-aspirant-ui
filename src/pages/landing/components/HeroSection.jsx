import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  { Icon: SiReact, label: 'React', delay: 0, duration: 3.2, drift: [10, -6, -8, 4], x: '8%', y: '18%' },
  { Icon: SiJavascript, label: 'JavaScript', delay: 0.3, duration: 4.1, drift: [-12, 8, 6, -10], x: '85%', y: '22%' },
  { Icon: SiTypescript, label: 'TypeScript', delay: 0.15, duration: 3.6, drift: [6, 12, -10, -4], x: '92%', y: '38%' },
  { Icon: SiNodedotjs, label: 'Node.js', delay: 0.6, duration: 3.8, drift: [-8, -10, 14, 6], x: '12%', y: '72%' },
  { Icon: SiPython, label: 'Python', delay: 0.2, duration: 4.4, drift: [14, 4, -6, -12], x: '78%', y: '68%' },
  { Icon: SiDjango, label: 'Django', delay: 0.5, duration: 3.5, drift: [-6, 14, 8, -8], x: '22%', y: '35%' },
  { Icon: SiFastapi, label: 'FastAPI', delay: 0.35, duration: 3.9, drift: [8, -12, -4, 10], x: '18%', y: '55%' },
  { Icon: SiAmazonwebservices, label: 'AWS', delay: 0.4, duration: 4.0, drift: [-10, 6, 12, -6], x: '72%', y: '45%' },
  { Icon: SiDocker, label: 'Docker', delay: 0.7, duration: 3.9, drift: [12, 10, -8, -14], x: '88%', y: '78%' },
  { Icon: SiKubernetes, label: 'Kubernetes', delay: 0.1, duration: 4.2, drift: [-4, -8, 10, 12], x: '5%', y: '52%' },
  { Icon: SiVuedotjs, label: 'Vue', delay: 0.25, duration: 3.7, drift: [6, 10, -12, 4], x: '75%', y: '18%' },
  { Icon: SiNextdotjs, label: 'Next.js', delay: 0.45, duration: 4.0, drift: [-14, 4, 8, -10], x: '6%', y: '32%' },
  { Icon: SiVite, label: 'Vite', delay: 0.55, duration: 3.4, drift: [10, -14, -6, 8], x: '82%', y: '58%' },
  { Icon: SiTailwindcss, label: 'Tailwind', delay: 0.2, duration: 3.8, drift: [-8, 6, 14, -8], x: '25%', y: '78%' },
  { Icon: SiGraphql, label: 'GraphQL', delay: 0.5, duration: 4.1, drift: [4, -10, -12, 6], x: '68%', y: '82%' },
  { Icon: SiMongodb, label: 'MongoDB', delay: 0.3, duration: 3.5, drift: [-12, -6, 8, 10], x: '38%', y: '22%' },
  { Icon: SiPostgresql, label: 'PostgreSQL', delay: 0.65, duration: 3.9, drift: [8, 12, -10, -6], x: '55%', y: '72%' },
  { Icon: SiRedis, label: 'Redis', delay: 0.4, duration: 3.6, drift: [-6, 8, 6, -12], x: '42%', y: '48%' },
  { Icon: SiGo, label: 'Go', delay: 0.1, duration: 4.2, drift: [12, 8, -8, -10], x: '58%', y: '28%' },
  { Icon: SiRust, label: 'Rust', delay: 0.6, duration: 3.7, drift: [-10, 12, 4, -8], x: '15%', y: '88%' },
  { Icon: SiFirebase, label: 'Firebase', delay: 0.35, duration: 4.0, drift: [6, -8, -14, 6], x: '88%', y: '42%' },
  { Icon: SiVercel, label: 'Vercel', delay: 0.2, duration: 3.8, drift: [-8, -12, 10, 8], x: '48%', y: '62%' },
  { Icon: SiSupabase, label: 'Supabase', delay: 0.45, duration: 3.5, drift: [10, 6, -6, -14], x: '32%', y: '42%' },
  { Icon: SiGithub, label: 'GitHub', delay: 0.5, duration: 4.1, drift: [-6, 10, 12, -8], x: '65%', y: '12%' },
  { Icon: SiFigma, label: 'Figma', delay: 0.3, duration: 3.6, drift: [8, -6, -10, 12], x: '8%', y: '62%' },
  { Icon: SiTensorflow, label: 'TensorFlow', delay: 0.55, duration: 3.9, drift: [-12, -4, 8, 10], x: '92%', y: '88%' },
];

const PARTICLES = Array.from({ length: 200 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 1 + Math.random() * 1.2,
}));

function FloatingParticles({ mouseX, mouseY }) {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const h = typeof window !== 'undefined' ? window.innerHeight : 800;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {PARTICLES.map((p) => {
        const dx = mouseX - (p.x / 100) * w;
        const dy = mouseY - (p.y / 100) * h;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(0, 1 - dist / 320);
        const pullX = (dx / (dist || 1)) * influence * 14;
        const pullY = (dy / (dist || 1)) * influence * 14;
        const scale = 1 + influence * 0.5;

        return (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-white/40"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              boxShadow: '0 0 6px rgba(255,255,255,0.35)',
              x: pullX,
              y: pullY,
              scale,
            }}
            transition={{
              x: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
              y: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
              scale: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
            }}
          />
        );
      })}
    </div>
  );
}

function TechIcon({ Icon, label, delay, duration, drift, x, y, mouseX, mouseY }) {
  const centerX = (parseFloat(x) / 100) * (typeof window !== 'undefined' ? window.innerWidth : 1200);
  const centerY = (parseFloat(y) / 100) * (typeof window !== 'undefined' ? window.innerHeight : 800);
  const dx = mouseX - centerX;
  const dy = mouseY - centerY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const parallax = Math.max(0, 1 - dist / 400) * 6;
  const moveX = (dx / (dist || 1)) * parallax;
  const moveY = (dy / (dist || 1)) * parallax;
  const [d0, d1, d2, d3] = drift;

  return (
    <motion.div
      className="absolute flex items-center justify-center rounded-xl text-white/50"
      style={{ left: x, top: y, x: moveX, y: moveY }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: [0.38, 0.52, 0.38],
        scale: 1,
      }}
      transition={{
        opacity: { duration: 2.2, repeat: Infinity, repeatType: 'reverse', delay },
        scale: { duration: 0.6, delay },
        x: { duration: 0.3 },
        y: { duration: 0.3 },
      }}
      whileHover={{ opacity: 0.7, scale: 1.1 }}
    >
      <motion.div
        className="p-3 rounded-xl transition-all duration-300"
        style={{
          boxShadow: '0 0 28px rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.08)',
        }}
        animate={{
          x: [0, d0, d2, 0],
          y: [0, d1, d3, 0],
        }}
        transition={{
          duration: duration + 0.5,
          repeat: Infinity,
          repeatType: 'reverse',
          delay,
        }}
      >
        <Icon className="w-8 h-8 md:w-10 md:h-10" title={label} />
      </motion.div>
    </motion.div>
  );
}

export default function HeroSection() {
  const sectionRef = useRef(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <section
      id="hero"
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, rgb(var(--nth-bg-hero-start)) 0%, rgb(var(--nth-bg-hero-mid)) 50%, rgb(var(--nth-bg-hero-end)) 100%)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 40%, rgb(var(--nth-primary) / 0.15) 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 40% 40% at 70% 60%, rgb(var(--nth-accent) / 0.08) 0%, transparent 60%)`,
        }}
      />
      <div
        className="absolute right-0 bottom-0 left-0 h-px"
        style={{
          background: `linear-gradient(to right, transparent, rgb(var(--nth-primary) / 0.4), transparent)`,
        }}
      />

      <FloatingParticles mouseX={mouse.x} mouseY={mouse.y} />

      <div className="absolute inset-0 pointer-events-none">
        {TECH_ICONS.map(({ Icon, label, delay, duration, drift, x, y }) => (
          <TechIcon
            key={label}
            Icon={Icon}
            label={label}
            delay={delay}
            duration={duration}
            drift={drift}
            x={x}
            y={y}
            mouseX={mouse.x}
            mouseY={mouse.y}
          />
        ))}
      </div>

      <div className="relative z-10 px-4 sm:px-6 text-center max-w-4xl mx-auto">
        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6"
          style={{ color: 'rgb(var(--nth-text-primary-dark))' }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          Real Jobs. Real Recruiters.{' '}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: `linear-gradient(to right, rgb(var(--nth-primary)), rgb(var(--nth-violet)), rgb(var(--nth-accent)))`,
              WebkitBackgroundClip: 'text',
              textShadow: '0 0 40px rgb(var(--nth-primary) / 0.2)',
            }}
          >
            Real Growth.
          </span>
        </motion.h1>

        <motion.p
          className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ color: 'rgb(var(--nth-text-secondary-dark))' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          Discover verified fresher, experienced, and senior-level job opportunities curated
          directly from trusted HR and recruiter networks.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.a
            href="/pricing"
            className="nth-btn-primary text-center min-w-[160px] sm:min-w-[200px] text-base sm:text-lg"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            View Plans & Enroll
          </motion.a>

          <motion.a
            href="/login"
            className="px-8 py-4 rounded-xl font-semibold text-center min-w-[200px] border bg-white/5 backdrop-blur-sm"
            style={{
              color: 'rgb(var(--nth-text-primary-dark))',
              borderColor: 'rgb(var(--nth-border-dark) / 0.8)',
            }}
            whileHover={{
              backgroundColor: 'rgb(241 245 249 / 0.08)',
              borderColor: 'rgb(var(--nth-primary) / 0.5)',
              y: -2,
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            Explore Jobs
          </motion.a>
        </motion.div>
      </div>

      {/* Slightly small wave at bottom – tileable path so loop syncs */}
      <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden pointer-events-none" aria-hidden="true">
        <svg
          className="w-[200%] h-10 sm:h-14 md:h-18 fill-white nth-wave-move"
          style={{ minHeight: '48px' }}
          viewBox="0 0 2400 120"
          preserveAspectRatio="none"
        >
          {/* One wave 0–1200: curve ends with same tangent as start for seamless tile */}
          <path d="M0,64 C300,120 900,8 1200,64 L1200,120 L0,120 Z M1200,64 C1500,120 2100,8 2400,64 L2400,120 L1200,120 Z" />
        </svg>
      </div>
    </section>
  );
}
