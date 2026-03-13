import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiAcademicCap, HiMapPin } from 'react-icons/hi2';
import { supabase } from '../../../../lib/supabase';
import SectionContainer from '../../../../components/SectionContainer';

function isExternalUrl(href) {
  if (!href || typeof href !== 'string') return false;
  const t = href.trim();
  return /^https?:\/\//i.test(t) || t.startsWith('//');
}

/** Same gradient CTA as MoneyBackGuaranteeSection so both sections match */
const CTA_GRADIENT_CLASS =
  'nth-cta-gradient inline-flex items-center justify-center w-fit px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 font-bold text-base sm:text-lg text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200';

function CtaButton({ href, label }) {
  const url = (href || '').trim();
  if (!url) return null;
  if (isExternalUrl(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={CTA_GRADIENT_CLASS}>
        {label || 'Open link'}
      </a>
    );
  }
  return (
    <Link to={url.startsWith('/') ? url : `/${url}`} className={CTA_GRADIENT_CLASS}>
      {label || 'Open link'}
    </Link>
  );
}

export default function BestInstituteHyderabadSection() {
  const [spotlight, setSpotlight] = useState(null);

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase
        .from('landing_institute_spotlight')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      if (error) {
        setSpotlight(null);
        return;
      }
      setSpotlight(data ?? null);
    };
    run();
  }, []);

  if (!spotlight) return null;

  const {
    badge,
    title,
    institute_name: instituteName,
    subtext,
    highlight,
    cta_link: ctaLink,
    cta_label: ctaLabel,
    left_panel_label: leftPanelLabel,
    image_url: imageUrl,
  } = spotlight;

  return (
    <section
      id="best-institute-hyderabad"
      className="relative overflow-hidden bg-[rgb(var(--nth-bg-light))]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(99,102,241,0.06)_0%,transparent_55%)] pointer-events-none" />

      <SectionContainer className="relative z-10">
        <motion.div
          className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/40 to-violet-50/30 shadow-lg shadow-indigo-100/50 overflow-hidden"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            <div className="lg:col-span-5 bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center min-h-[200px] lg:min-h-[280px] p-8 relative overflow-hidden">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />
              ) : null}
              <div className={`text-center relative z-10 ${imageUrl ? 'drop-shadow-lg' : ''}`}>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm mb-4 text-white">
                  <HiAcademicCap className="w-8 h-8" />
                </div>
                <p className="text-sm font-medium text-indigo-100 uppercase tracking-widest">{leftPanelLabel || 'Featured partner'}</p>
                <p className="mt-2 text-xl sm:text-2xl font-extrabold text-white tracking-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.25)]">
                  {instituteName}
                </p>
              </div>
            </div>

            <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold uppercase tracking-wider w-fit mb-4">
                <HiMapPin className="w-3.5 h-3.5" />
                {badge}
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[rgb(var(--nth-text-primary-light))] tracking-tight mb-3">
                {title}
              </h2>
              <p className="nth-cta-gradient text-xl sm:text-2xl font-bold tracking-tight mb-4 w-fit rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2 text-white shadow-md shadow-indigo-500/20">
                {instituteName}
              </p>
              <p className="text-base text-[rgb(var(--nth-text-secondary-light))] leading-relaxed mb-4">
                {subtext}
              </p>
              {highlight ? (
                <p className="text-sm text-slate-600 border-l-4 border-indigo-400 pl-4 py-1 mb-6 italic">
                  {highlight}
                </p>
              ) : (
                <div className="mb-6" />
              )}
              <CtaButton href={ctaLink} label={ctaLabel} />
            </div>
          </div>
        </motion.div>
      </SectionContainer>
    </section>
  );
}
