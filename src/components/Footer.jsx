import { Link, useLocation } from 'react-router-dom';
import { Instagram } from 'lucide-react';
import SectionContainer from './SectionContainer';

const FOOTER_COLUMNS = [
  {
    title: 'Company',
    links: [{ label: 'About Us', to: '/about' }],
  },
  {
    title: 'Explore',
    links: [
      { label: 'Pricing', to: '/pricing' },
      { label: 'How it works', to: '/#how-it-works' },
      { label: 'Contact', to: '/contact' },
      { label: 'Login', to: '/login' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Refund Policy', to: '/refund-policy' },
      { label: 'Terms & Conditions', to: '/terms-and-conditions' },
      { label: 'Privacy Policy', to: '/privacy-policy' },
    ],
  },
];

function FooterNavColumn({ title, links, resolveTo }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
      <nav className="flex flex-col gap-2">
        {links.map((link) => {
          const to = resolveTo(link.to);
          return link.to.startsWith('mailto:') ? (
            <a
              key={link.label}
              href={link.to}
              className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ) : (
            <Link
              key={link.label}
              to={to}
              className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function Footer() {
  const location = useLocation();
  const pricingTo = `/pricing?from=${encodeURIComponent(location.pathname || '/')}`;

  const resolveTo = (path) => (path === '/pricing' ? pricingTo : path);

  return (
    <footer
      className="relative py-10 sm:py-12"
      style={{ backgroundColor: 'rgb(var(--nth-bg-dark))' }}
    >
      <SectionContainer useGrid>
        <div className="col-span-full flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
          <Link to="/" className="flex shrink-0 items-center self-start">
            <img src="/white-logo.png" alt="Naveen Talent Hub" className="h-8 sm:h-9 w-auto object-contain" />
          </Link>

          <div className="grid min-w-0 grid-cols-2 gap-x-8 gap-y-10 sm:gap-x-10 md:grid-cols-4 md:gap-x-12 lg:w-auto lg:shrink-0">
            {FOOTER_COLUMNS.map((col) => (
              <FooterNavColumn key={col.title} title={col.title} links={col.links} resolveTo={resolveTo} />
            ))}

            <div className="flex min-w-0 flex-col gap-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Social</p>
              <a
                href="https://www.instagram.com/naveen_talent_pro/"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-fit items-center gap-2 text-sm font-medium text-slate-400 transition-all duration-300 hover:text-white"
                aria-label="Instagram"
              >
                <div className="rounded-lg bg-white/5 p-2 transition-all duration-300 group-hover:scale-110 group-hover:bg-pink-500/10">
                  <Instagram size={18} className="transition-colors group-hover:text-pink-500" />
                </div>
                <span className="hidden sm:inline">Follow us</span>
              </a>
            </div>
          </div>
        </div>

        <div className="col-span-full mt-10 border-t border-white/10 pt-6 sm:mt-12 sm:pt-8">
          <p className="text-xs text-slate-500 sm:text-sm">
            © {new Date().getFullYear()} Naveen Talent Hub. All rights reserved.
          </p>
        </div>
      </SectionContainer>
    </footer>
  );
}
