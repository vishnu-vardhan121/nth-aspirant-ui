import { Link, useLocation } from 'react-router-dom';
import { HiBellAlert } from 'react-icons/hi2';
import SectionContainer from '../../../../components/SectionContainer';

/**
 * NTH Connect section – "Connect directly with hiring managers".
 * Always shown as the third section on the landing page.
 */
export default function NTHConnectSection() {
  const location = useLocation();
  const pricingTo = `/pricing?from=${encodeURIComponent(location.pathname || '/')}`;

  return (
    <section
      id="nth-connect"
      className="relative bg-gradient-to-b from-indigo-50/80 via-white to-slate-50/50 py-10 sm:py-12 md:py-14 overflow-hidden"
    >
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgb(99 102 241 / 0.12) 1px, transparent 0)`,
            backgroundSize: '28px 28px',
          }}
        />
      </div>
      <SectionContainer>
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
          <div className="flex-1 text-center lg:text-left order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-indigo-100 text-indigo-900 text-xs sm:text-sm font-semibold mb-3 sm:mb-4">
              <HiBellAlert className="w-4 h-4 shrink-0" />
              New roles coming soon
            </div>
            <h2 className="text-lg min-[375px]:text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight mb-2 sm:mb-3 leading-tight">
              Connect directly with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                hiring managers
              </span>
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-slate-700 text-center lg:text-left mb-5 sm:mb-6 leading-relaxed">
              Skip the job portals. When we have openings, they're vetted and shared here—so you apply to real
              companies and real people.
            </p>
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <Link
                to={pricingTo}
                className="nth-btn-primary inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base sm:text-lg font-semibold hover:text-white"
              >
                Get Started Now
              </Link>
            </div>
          </div>
          <div className="flex-1 w-full max-w-md mx-auto lg:max-w-none order-1 lg:order-2">
            <img
              src="/hero-section/Gemini_Generated_Image_fmv3s7fmv3s7fmv3.png"
              alt="Naveen Talent Hub—connect directly with hiring managers instead of the crowded job market"
              className="w-full h-auto object-contain drop-shadow-lg rounded-lg"
            />
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
