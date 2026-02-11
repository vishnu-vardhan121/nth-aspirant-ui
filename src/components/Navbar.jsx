import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'How It Works', to: '#how-it-works' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Login', to: '/login' },
];

function NavLink({ label, to, variant }) {
  const isApp = variant === 'app';
  const isExternal = to.startsWith('#');
  const className = `relative text-sm font-medium tracking-wide px-3 py-2 rounded-lg transition-colors ${
    isApp ? 'text-slate-600 hover:text-[rgb(var(--nth-primary))]' : 'text-white/90 hover:text-white'
  }`;
  const underlineStyle = isApp ? { backgroundColor: 'rgb(var(--nth-primary) / 0.8)' } : { backgroundColor: 'rgb(var(--nth-accent) / 0.8)' };

  if (isExternal) {
    return (
      <motion.a
        href={to}
        className={className}
        whileHover={{ y: -1 }}
        transition={{ duration: 0.2 }}
      >
        <span className="relative z-10">{label}</span>
        <motion.span
          className="absolute bottom-1 left-3 right-3 h-px rounded-full"
          style={{ originX: 0, ...underlineStyle }}
          initial={{ scaleX: 0, opacity: 0 }}
          whileHover={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.25 }}
        />
      </motion.a>
    );
  }

  return (
    <Link to={to}>
      <motion.span
        className={`block ${className}`}
        whileHover={{ y: -1 }}
        transition={{ duration: 0.2 }}
      >
        <span className="relative z-10">{label}</span>
        <motion.span
          className="absolute bottom-1 left-3 right-3 h-px rounded-full"
          style={{ originX: 0, ...underlineStyle }}
          initial={{ scaleX: 0, opacity: 0 }}
          whileHover={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.25 }}
        />
      </motion.span>
    </Link>
  );
}

export default function Navbar({ variant = 'hero' }) {
  const isApp = variant === 'app';
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-3 sm:py-4"
    >
      <nav
        className="max-w-6xl mx-auto flex items-center justify-between rounded-xl sm:rounded-2xl px-4 sm:px-6 py-2.5 sm:py-3 transition-all duration-300"
        style={
          isApp
            ? {
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(30, 58, 138, 0.08)',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
              }
            : {
                background: 'rgba(15, 23, 42, 0.4)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }
        }
      >
        <Link to="/" className="flex items-center gap-1 select-none">
          <motion.span
            className="inline-block"
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <span
              className={`inline-block text-xl sm:text-2xl font-extrabold tracking-tight ${isApp ? 'nth-brand-gradient' : 'nth-brand-gradient-light'}`}
            >
              NTH
            </span>
          </motion.span>
        </Link>

        <ul className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <NavLink label={link.label} to={link.to} variant={isLanding ? variant : 'app'} />
            </li>
          ))}
        </ul>
      </nav>
    </motion.header>
  );
}
