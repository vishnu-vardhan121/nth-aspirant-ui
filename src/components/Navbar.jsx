import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { signOut } from '../store/slices/authSlice';

const STATIC_LINKS = [
  { label: 'How It Works', to: '#how-it-works' },
  { label: 'Pricing', to: '/pricing' },
];

function NavLink({ label, to, isScrolled, isApp }) {
  const isExternal = to.startsWith('#');
  
  // Text color logic:
  // - If isApp (not landing page): always dark text
  // - If isScrolled (scrolled down on landing): dark text
  // - Default (at top of landing): white text
  const isHeroState = !isApp && !isScrolled;

  const textColorClass = (isApp || isScrolled) 
    ? 'text-slate-600 hover:text-[rgb(var(--nth-primary))]' 
    : 'text-white/90 hover:text-white';

  const underlineColor = (isApp || isScrolled)
    ? 'rgb(var(--nth-primary) / 0.8)'
    : 'white';

  const content = (
    <span className={`relative text-sm font-medium tracking-wide px-3 py-2 rounded-lg transition-colors ${textColorClass}`}>
      <span className="relative z-10">{label}</span>
      <motion.span
        className="absolute bottom-1 left-3 right-3 h-px rounded-full"
        style={{ originX: 0, backgroundColor: underlineColor }}
        initial={{ scaleX: 0, opacity: 0 }}
        whileHover={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.25 }}
      />
    </span>
  );

  if (isExternal) {
    return (
      <motion.a href={to} whileHover={{ y: -1 }} transition={{ duration: 0.2 }}>
        {content}
      </motion.a>
    );
  }

  return (
    <Link to={to}>
      <motion.span className="block" whileHover={{ y: -1 }} transition={{ duration: 0.2 }}>
        {content}
      </motion.span>
    </Link>
  );
}

export default function Navbar() {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => !!state.auth.user);
  const isLanding = location.pathname === '/';
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const authLinks = isAuthenticated
    ? [
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Sign out', isSignOut: true },
      ]
    : [{ label: 'Login', to: '/login' }];
  const navLinks = [...STATIC_LINKS, ...authLinks].map((link) =>
    link.to === '/pricing'
      ? { ...link, to: `/pricing?from=${encodeURIComponent(location.pathname || '/')}` }
      : link
  );

  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 50) {
      setIsScrolled(true);
    } else {
      setIsScrolled(false);
    }
  });

  // Force 'app' style (light bg, dark text) if not on landing page
  // OR if on landing page but scrolled down
  const showLightStyle = !isLanding || isScrolled;

  const navbarStyles = {
    background: showLightStyle || isMobileMenuOpen
      ? (showLightStyle ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.95)')
      : '#0B1120', // Solid dark navy for hero section (matches reference)
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    border: showLightStyle 
      ? '1px solid rgba(30, 58, 138, 0.08)' 
      : 'none',
    boxShadow: showLightStyle ? '0 4px 24px rgba(0, 0, 0, 0.06)' : 'none',
    transition: 'all 0.3s ease'
  };

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-3 sm:py-4"
    >
      <nav
        className="max-w-6xl mx-auto flex items-center justify-between rounded-xl sm:rounded-2xl px-4 sm:px-6 py-2.5 sm:py-3 transition-all duration-300 relative"
        style={navbarStyles}
      >
            <Link 
              to="/" 
              className="flex items-center gap-2 group"
              onClick={(e) => handleLinkClick(e, '/')}
            >
              <img 
                src={showLightStyle ? "/lologo.png" : "/lilogo.png"}
                alt="Naveen Talent Hub"
                className="h-10 md:h-12 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </Link>

        {/* Desktop Links */}
        <ul className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <li key={link.label}>
              {link.isSignOut ? (
                <button
                  type="button"
                  onClick={() => {
                    dispatch(signOut());
                    setIsMobileMenuOpen(false);
                  }}
                  className={`relative text-sm font-medium tracking-wide px-3 py-2 rounded-lg transition-colors ${
                    !isLanding || isScrolled
                      ? 'text-slate-600 hover:text-[rgb(var(--nth-primary))]'
                      : 'text-white/90 hover:text-white'
                  }`}
                >
                  {link.label}
                </button>
              ) : (
                <NavLink
                  label={link.label}
                  to={link.to}
                  isScrolled={isScrolled}
                  isApp={!isLanding}
                />
              )}
            </li>
          ))}
        </ul>

        <motion.button
          className={`md:hidden p-2 rounded-lg z-50 relative transition-colors bg-transparent ${
            showLightStyle ? 'hover:bg-slate-100' : 'hover:bg-white/10'
          }`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          animate={isMobileMenuOpen ? "open" : "closed"}
          style={{ 
            color: showLightStyle ? '#475569' : 'white',
            background: 'transparent',
            border: 'none',
            outline: 'none'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <motion.path 
              variants={{
                closed: { d: "M4 6h16" },
                open: { d: "M6 18L18 6" }
              }} 
            />
            <motion.path 
              d="M4 12h16" 
              variants={{
                closed: { opacity: 1 },
                open: { opacity: 0 }
              }} 
              transition={{ duration: 0.1 }}
            />
            <motion.path 
              variants={{
                closed: { d: "M4 18h16" },
                open: { d: "M6 6l12 12" }
              }} 
            />
          </svg>
        </motion.button>

        {/* Mobile Dropdown - Filtered for Pricing/Login only */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`absolute top-full left-0 right-0 p-4 mt-2 backdrop-blur-xl border rounded-2xl shadow-xl md:hidden z-50 ${
              showLightStyle 
                ? 'bg-white/95 border-slate-200' 
                : 'bg-slate-900/95 border-white/10'
            }`}
          >
            <ul className="flex flex-col gap-2">
              {navLinks.filter((l) => l.to === '/pricing' || l.to === '/login' || l.to === '/dashboard' || l.isSignOut).map((link) => (
                <li key={link.label}>
                  {link.isSignOut ? (
                    <button
                      type="button"
                      className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-colors ${
                        showLightStyle
                          ? 'text-slate-600 hover:bg-slate-50 hover:text-[rgb(var(--nth-primary))]'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                      onClick={() => {
                        dispatch(signOut());
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      {link.label}
                    </button>
                  ) : (
                    <Link
                      to={link.to}
                      className={`block px-4 py-3 rounded-xl font-medium transition-colors ${
                        showLightStyle
                          ? 'text-slate-600 hover:bg-slate-50 hover:text-[rgb(var(--nth-primary))]'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </nav>
    </motion.header>
  );
}
