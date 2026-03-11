import { Link, useLocation } from 'react-router-dom';
import SectionContainer from './SectionContainer';

const FOOTER_LINKS = [
  { label: 'Pricing', to: '/pricing' },
  { label: 'Login', to: '/login' },
  { label: 'How it works', to: '/#how-it-works' },
  { label: 'Contact', to: 'mailto:contact@nth.example.com' },
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
            <img src="/lilogo.png" alt="NTH" className="h-8 sm:h-9 w-auto object-contain" />
          </Link>
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
        </div>
        <div className="col-span-full mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/10">
          <p className="text-xs sm:text-sm text-slate-500">
            © {new Date().getFullYear()} NTH. All rights reserved.
          </p>
        </div>
      </SectionContainer>
    </footer>
  );
}
