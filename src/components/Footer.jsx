import { Link, useLocation } from 'react-router-dom';
import { Instagram } from 'lucide-react';
import SectionContainer from './SectionContainer';

const FOOTER_LINKS = [
  { label: 'Pricing', to: '/pricing' },
  { label: 'Guarantee', to: '/guarantee' },
  { label: 'Login', to: '/login' },
  { label: 'How it works', to: '/#how-it-works' },
  { label: 'Contact', to: 'mailto:bollipallinaveen0@gmail.com' },
];

export default function Footer() {
  const location = useLocation();
  const pricingTo = `/pricing?from=${encodeURIComponent(location.pathname || '/')}`;

  return (
    <footer
      className="relative py-8 sm:py-10"
      style={{ backgroundColor: 'rgb(var(--nth-bg-dark))' }}
    >
      <SectionContainer useGrid>
        <div className="col-span-full flex flex-col gap-6 sm:gap-8 md:flex-row md:items-center md:justify-between">
          <Link to="/" className="flex items-center">
            <img src="/white-logo.png" alt="Naveen Talent Hub" className="h-8 sm:h-9 w-auto object-contain" />
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
            <nav className="flex flex-wrap items-center gap-4 sm:gap-6">
              {FOOTER_LINKS.map((link) => {
                const to = link.to === '/pricing' ? pricingTo : link.to;
                return link.to.startsWith('mailto:') ? (
                  <a
                    key={link.label}
                    href={link.to}
                    className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    to={to}
                    className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="flex items-center gap-4 border-t border-white/5 sm:border-t-0 sm:border-l sm:pl-8 pt-6 sm:pt-0">
              <a
                href="https://www.instagram.com/naveen_talent_pro/"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-all duration-300"
                aria-label="Instagram"
              >
                <div className="p-2 bg-white/5 rounded-lg group-hover:bg-pink-500/10 group-hover:scale-110 transition-all duration-300">
                  <Instagram size={18} className="group-hover:text-pink-500 transition-colors" />
                </div>
                <span className="md:hidden lg:inline">Follow us</span>
              </a>
            </div>
          </div>
        </div>
        <div className="col-span-full mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/10">
          <p className="text-xs sm:text-sm text-slate-500">
            © {new Date().getFullYear()} Naveen Talent Hub. All rights reserved.
          </p>
        </div>
      </SectionContainer>
    </footer>
  );
}
