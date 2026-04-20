/**
 * JobOpeningsSection — shared by landing (`variant="landing"`) and `/jobs` (`variant="directory"`).
 * Landing uses the original NTH Connect–aligned layout; directory reuses the same cards/grid with a full list.
 */

import { Link, useLocation } from 'react-router-dom';
import { HiMapPin, HiSparkles, HiLockClosed, HiBriefcase, HiArrowRight } from 'react-icons/hi2';
import SectionContainer from '../../../../components/SectionContainer';
import { PageLoader } from '../../../../components/ui/Loader';
import { useState, useEffect, useMemo } from 'react';
import { useAppSelector } from '../../../../store/hooks';
import { supabase } from '../../../../lib/supabase';

function JobCardLanding({ job, hoveredId, setHoveredId, isAuthenticated, pricingTo }) {
  const isFree = job.isFree;
  const isHovered = hoveredId === job.id;
  const canView = isFree || isAuthenticated;

  return (
    <article
      className={`relative group rounded-2xl overflow-hidden flex flex-col h-full bg-white border transition-all duration-300 ${
        isFree ? 'border-indigo-100 hover:border-indigo-200' : 'border-violet-100 hover:border-violet-200'
      } ${isHovered ? 'shadow-xl shadow-slate-200/50 -translate-y-0.5' : 'shadow-sm hover:shadow-lg'}`}
      onMouseEnter={() => setHoveredId(job.id)}
      onMouseLeave={() => setHoveredId(null)}
    >
      <div className="p-4 sm:p-5 lg:p-5 xl:p-5 flex flex-col h-full min-w-0">
        <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
          {isFree ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
              <HiSparkles className="w-3.5 h-3.5 shrink-0" />
              Free
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">
              <HiBriefcase className="w-3.5 h-3.5 shrink-0" />
              Premium
            </span>
          )}
          <span className="text-xs font-semibold text-slate-800 text-right shrink-0 max-w-[50%] truncate">
            {job.experience}
          </span>
        </div>

        <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5 sm:mb-2 leading-tight line-clamp-2 min-w-0">
          {job.title}
        </h3>

        <div className="mb-3 sm:mb-4 space-y-1 sm:space-y-1.5 min-w-0">
          {canView ? (
            <p className="text-xs sm:text-sm font-semibold text-indigo-700 truncate">{job.company}</p>
          ) : (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
              <HiLockClosed className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <p className="text-xs text-slate-600 font-medium">Premium Members Only</p>
            </div>
          )}
          {job.city && job.city !== '—' && (
            <p className="text-xs sm:text-sm text-slate-700 flex items-center gap-1.5 min-w-0">
              <HiMapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">{job.city}</span>
            </p>
          )}
          {job.applicationDeadline && (
            <p className="text-xs text-slate-600">Apply by {job.applicationDeadline}</p>
          )}
        </div>

        {job.requirements?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-auto mb-3 sm:mb-4">
            {job.requirements.slice(0, 3).map((req) => (
              <span
                key={req}
                className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 text-xs font-medium border border-slate-100"
              >
                {req}
              </span>
            ))}
            {job.requirements.length > 3 && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs font-medium">
                +{job.requirements.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto pt-3 sm:pt-4 border-t border-slate-100">
          {job.isExpired ? (
            <div className="w-full text-center px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold text-slate-400 bg-slate-50 border border-slate-100 cursor-not-allowed">
              Application closed
            </div>
          ) : canView ? (
            isFree ? (
              <Link
                to={`/jobs/${job.id}`}
                className="flex items-center justify-center gap-2 w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                Apply Now
              </Link>
            ) : (
              <Link
                to={pricingTo}
                className="flex items-center justify-center gap-2 w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm bg-violet-600 hover:bg-violet-700 text-white transition-colors"
              >
                View Plans to Apply
              </Link>
            )
          ) : (
            <Link
              to={pricingTo}
              className="flex items-center justify-center gap-2 w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <HiLockClosed className="w-4 h-4" />
              Unlock Position
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export default function JobOpeningsSection({
  /** `landing` = original home section look; `directory` = `/jobs` full list, same chrome. */
  variant = 'landing',
  previewLimit = null,
  viewAllTo = null,
  hideWhenEmpty = true,
} = {}) {
  const location = useLocation();
  const [hoveredId, setHoveredId] = useState(null);
  const [activeTab, setActiveTab] = useState('free');
  const [landingJobs, setLandingJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const isAuthenticated = useAppSelector((state) => !!state.auth.user);
  const pricingTo = `/pricing?from=${encodeURIComponent(location.pathname || '/')}`;
  const isDirectory = variant === 'directory';

  useEffect(() => {
    const formatDate = (dateStr) => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };
    const isExpired = (deadlineStr) => {
      if (!deadlineStr) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deadline = new Date(deadlineStr);
      deadline.setHours(0, 0, 0, 0);
      return today > deadline;
    };
    const fetchJobs = async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, company_name, location, audience_tracks, allowed_plans, application_deadline, walk_in_date, address, apply_link')
        .eq('show_on_landing', true)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setLandingJobs(data.map((j) => {
          const tracks = Array.isArray(j.audience_tracks) ? j.audience_tracks : [];
          const hasFresher = tracks.includes('fresher');
          const hasExperienced = tracks.includes('experienced');
          const experienceLabel = hasFresher && hasExperienced
            ? 'Fresher & Experienced'
            : hasFresher
              ? 'Fresher'
              : hasExperienced
                ? 'Experienced'
                : 'Fresher';
          return {
            id: j.id,
            title: j.title,
            company: j.company_name ?? '',
            city: j.location ?? '—',
            experience: experienceLabel,
            requirements: [],
            isFree: !(j.allowed_plans && j.allowed_plans.length),
            applyLink: j.apply_link || '/dashboard/jobs',
            applicationDeadline: formatDate(j.application_deadline),
            walkInDate: formatDate(j.walk_in_date),
            address: j.address ?? '',
            isExpired: isExpired(j.application_deadline),
          };
        }));
      }
      setLoading(false);
    };
    fetchJobs();
  }, []);

  const hasFresherJobs = landingJobs.some((j) => j.experience === 'Fresher' || j.experience === 'Fresher & Experienced');
  const hasExperiencedJobs = landingJobs.some((j) => j.experience === 'Experienced' || j.experience === 'Fresher & Experienced');
  const experienceFilteredJobs = useMemo(() => {
    if (!hasFresherJobs) return landingJobs.filter((j) => j.experience === 'Experienced');
    if (!hasExperiencedJobs) return landingJobs.filter((j) => j.experience === 'Fresher' || j.experience === 'Fresher & Experienced');
    return landingJobs;
  }, [landingJobs, hasFresherJobs, hasExperiencedJobs]);

  const hasFreeJobs = experienceFilteredJobs.some((j) => j.isFree);
  const hasPremiumJobs = experienceFilteredJobs.some((j) => !j.isFree);
  const showTabSelector = hasFreeJobs && hasPremiumJobs;

  const filteredJobs = useMemo(() => {
    if (!showTabSelector) return experienceFilteredJobs;
    return experienceFilteredJobs.filter((job) => (activeTab === 'free' ? job.isFree : !job.isFree));
  }, [experienceFilteredJobs, activeTab, showTabSelector]);

  const displayJobs = useMemo(() => {
    if (previewLimit == null || previewLimit <= 0) return filteredJobs;
    return filteredJobs.slice(0, previewLimit);
  }, [filteredJobs, previewLimit]);

  const freeJobs = useMemo(
    () => experienceFilteredJobs.filter((j) => j.isFree),
    [experienceFilteredJobs],
  );
  const premiumJobs = useMemo(
    () => experienceFilteredJobs.filter((j) => !j.isFree),
    [experienceFilteredJobs],
  );

  const showViewAll = Boolean(
    viewAllTo
      && previewLimit != null
      && previewLimit > 0
      && (showTabSelector
        ? freeJobs.length > previewLimit || premiumJobs.length > previewLimit
        : experienceFilteredJobs.length > previewLimit),
  );

  if (!loading && landingJobs.length === 0 && hideWhenEmpty) {
    return null;
  }

  const sectionY = isDirectory
    ? 'pt-2 pb-10 sm:pb-12 md:pb-14'
    : 'py-10 sm:py-12 md:py-14 lg:py-12 xl:py-14';

  const jobGridClass = isDirectory
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 w-full max-w-6xl mx-auto'
    /* Landing: max 3 cols from lg+ so six previews layout as 3+3 (avoid xl:4 → 4+2). */
    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6';

  return (
    <section
      id="job-openings"
      className={`relative scroll-mt-24 bg-gradient-to-b from-indigo-50/60 via-white to-slate-50/60 ${sectionY} overflow-x-clip overflow-y-visible`}
    >
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(99 102 241 / 0.1) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <SectionContainer useGrid wider className="relative z-10">
        <div className="col-span-full text-center px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-indigo-100 text-indigo-900 text-xs sm:text-sm font-semibold mb-3">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-indigo-500 animate-pulse" />
            {isDirectory ? 'All openings' : 'Currently Hiring'}
          </div>
          <h2 className="text-lg min-[375px]:text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-4xl font-bold text-slate-900 tracking-tight mb-2 leading-tight">
            {isDirectory ? (
              <>
                Browse every{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                  open position
                </span>
              </>
            ) : (
              <>
                Find your next{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                  career opportunity
                </span>
              </>
            )}
          </h2>
          <p className="text-slate-700 max-w-xl xl:max-w-2xl mx-auto text-sm sm:text-base md:text-lg leading-relaxed">
            {isDirectory
              ? 'Same curated roles as the home page—free and premium—in one place.'
              : 'Hand-picked positions from innovative companies. Your perfect role is waiting.'}
          </p>
        </div>

        {showTabSelector && (
          <div className="col-span-full flex justify-center px-4 sm:px-6">
            <div className="inline-flex p-1 rounded-xl bg-white/90 border border-slate-200/80 shadow-sm">
              {['free', 'premium'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-4 sm:px-5 lg:px-6 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 capitalize ${
                    activeTab === tab
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-800 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {tab === 'free' ? (
                    <span className="flex items-center gap-2">
                      <HiSparkles className="w-4 h-4" />
                      {tab}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <HiBriefcase className="w-4 h-4" />
                      {tab}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="col-span-full px-4 sm:px-6 lg:px-0">
          {loading ? (
            <div className="flex justify-center py-10 sm:py-12">
              <PageLoader size="lg" label="Loading jobs…" variant="dots" />
            </div>
          ) : landingJobs.length === 0 ? (
            <div className="col-span-full text-center py-10 sm:py-12 px-4">
              <div className="inline-flex flex-col items-center gap-3 sm:gap-4 p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 max-w-md mx-auto shadow-sm">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                  <HiBriefcase className="w-7 h-7 text-slate-500" />
                </div>
                <p className="text-slate-700 font-medium">No positions available right now</p>
                <p className="text-slate-600 text-sm">Check back soon for new opportunities</p>
              </div>
            </div>
          ) : (
            <div key={activeTab} className={jobGridClass}>
              {displayJobs.length > 0 ? (
                displayJobs.map((job) => (
                  <JobCardLanding
                    key={job.id}
                    job={job}
                    hoveredId={hoveredId}
                    setHoveredId={setHoveredId}
                    isAuthenticated={isAuthenticated}
                    pricingTo={pricingTo}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-10 sm:py-12 px-4">
                  <div className="inline-flex flex-col items-center gap-3 sm:gap-4 p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 max-w-md mx-auto shadow-sm">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                      <HiBriefcase className="w-7 h-7 text-slate-500" />
                    </div>
                    <p className="text-slate-700 font-medium">
                      {showTabSelector
                        ? `No ${activeTab} positions available right now`
                        : 'No positions available right now'}
                    </p>
                    <p className="text-slate-600 text-sm">Check back soon for new opportunities</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {showViewAll && (
          <div className="col-span-full flex justify-center px-4 sm:px-6 pt-6 sm:pt-8 pb-1">
            <Link
              to={viewAllTo}
              className="group inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 sm:px-8 sm:py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/30 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              View all jobs
              <HiArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}
      </SectionContainer>
    </section>
  );
}
