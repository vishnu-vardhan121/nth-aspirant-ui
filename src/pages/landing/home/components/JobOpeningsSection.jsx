/**
 * JobOpeningsSection Component
 * 
 * Note: This component uses responsive Tailwind classes.
 * Ensure your tailwind.config.js includes these breakpoints:
 * 
 * theme: {
 *   extend: {
 *     screens: {
 *       'xs': '475px',
 *       'sm': '640px',
 *       'md': '768px',
 *       'lg': '1024px',
 *       'xl': '1280px',
 *     }
 *   }
 * }
 */

import { Link, useLocation } from 'react-router-dom';
import { HiMapPin, HiSparkles, HiArrowRight, HiLockClosed, HiBriefcase, HiBellAlert } from 'react-icons/hi2';
import SectionContainer from '../../../../components/SectionContainer';
import { PageLoader } from '../../../../components/ui/Loader';
import { useState, useEffect, useMemo } from 'react';
import { useAppSelector } from '../../../../store/hooks';
import { supabase } from '../../../../lib/supabase';

/** When there are no jobs, show this section instead of empty job cards. */
function NoJobsConnectSection() {
  const location = useLocation();
  const pricingTo = `/pricing?from=${encodeURIComponent(location.pathname || '/')}`;

  return (
    <section
      id="job-openings"
      className="relative bg-gradient-to-b from-indigo-50/80 via-white to-slate-50/50 py-16 sm:py-20 md:py-24 overflow-hidden"
    >
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgb(99 102 241 / 0.12) 1px, transparent 0)`,
          backgroundSize: '28px 28px'
        }} />
      </div>
      <SectionContainer>
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14">
          <div className="flex-1 text-center lg:text-left order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100/80 text-indigo-800 text-sm font-semibold mb-6">
              <HiBellAlert className="w-4 h-4" />
              New roles coming soon
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4">
              Connect directly with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">hiring managers</span>
            </h2>
            <p className="text-lg text-slate-600 text-center  mb-8">
              Skip the job portals. When we have openings, they’re vetted and shared here—so you apply to real companies and real people.
            </p>
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <Link
                to={pricingTo}
                className="nth-btn-primary inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-lg font-semibold hover:text-white"
              >
                Get Started Now
                <HiArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="flex-1 w-full max-w-xl mx-auto lg:max-w-none order-1 lg:order-2">
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

function JobCard({ job, hoveredId, setHoveredId, isAuthenticated, pricingTo }) {
  const isFree = job.isFree;
  const isHovered = hoveredId === job.id;
  const canView = isFree || isAuthenticated;
  const [applying, setApplying] = useState(false);

  const handleApply = async () => {
    if (job.isExpired || applying) return;
    if (!isAuthenticated) {
      if (job.applyLink?.startsWith('http')) window.open(job.applyLink, '_blank');
      else window.location.href = job.applyLink || '/dashboard/jobs';
      return;
    }
    setApplying(true);
    const { data } = await supabase.rpc('record_application', { p_job_id: job.id });
    setApplying(false);
    if (data?.ok) {
      if (job.applyLink?.startsWith('http')) window.open(job.applyLink, '_blank');
      else window.location.href = job.applyLink || '/dashboard/jobs';
    }
  };

  return (
    <article
      className={`relative group rounded-2xl overflow-hidden transition-shadow duration-300 flex flex-col h-full ${
        isHovered
          ? 'shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]'
          : 'shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_15px_45px_-12px_rgba(0,0,0,0.12)]'
      }`}
      onMouseEnter={() => setHoveredId(job.id)}
      onMouseLeave={() => setHoveredId(null)}
    >
      {/* Static gradient background - theme: indigo / violet / sky */}
      <div className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-300 ${
        isFree
          ? 'from-indigo-50 via-white to-sky-50/30'
          : 'from-violet-50 via-white to-indigo-50/30'
      } ${isHovered ? 'opacity-100' : 'opacity-70'}`} />

      {/* Border */}
      <div className={`absolute inset-0 rounded-2xl transition-opacity duration-500 ${
        isFree
          ? 'ring-1 ring-indigo-200/60'
          : 'ring-1 ring-violet-200/60'
      } ${isHovered ? 'ring-2' : ''}`} />

      <div className="relative z-10 p-5 sm:p-6 lg:p-7 flex flex-col h-full">
        {/* Header with Badges */}
        <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
          <div className="flex flex-wrap gap-2">
            {isFree ? (
              <span className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-indigo-200/50">
                <HiSparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden xs:inline">Free</span>
                <span className="inline xs:hidden">F</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-violet-200/50">
                <HiBriefcase className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden xs:inline">Premium</span>
                <span className="inline xs:hidden">Pro</span>
              </span>
            )}
          </div>
          
          <span className="inline-flex items-center px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/80 backdrop-blur-sm text-slate-600 text-xs font-semibold shadow-sm border border-slate-200/60 shrink-0">
            {job.experience}
          </span>
        </div>

        {/* Job Title */}
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 leading-tight transition-colors duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-slate-900 group-hover:to-slate-600">
          {job.title}
        </h3>

        {/* Company & Location */}
        <div className="mb-5 sm:mb-6 space-y-2.5">
          {canView ? (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isFree ? 'bg-indigo-500' : 'bg-violet-500'
              } shadow-sm shrink-0`} />
              <p className="text-sm font-semibold text-slate-700 truncate">
                {job.company}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100/60 border border-slate-200/60">
              <HiLockClosed className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <p className="text-xs sm:text-sm text-slate-500 font-medium truncate">
                Premium Members Only
              </p>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <HiMapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{job.city}</span>
          </div>
          {job.applicationDeadline && (
            <p className="text-xs text-slate-500">Apply by {job.applicationDeadline}</p>
          )}
          {job.walkInDate && (
            <p className="text-xs text-slate-500">Walk-in: {job.walkInDate}</p>
          )}
          {job.address && canView && (
            <p className="text-xs text-slate-500 truncate" title={job.address}>Address: {job.address}</p>
          )}
        </div>

        {/* Skills Tags */}
        <div className="flex flex-wrap gap-2 mt-auto">
          {job.requirements.slice(0, 3).map((req) => (
            <span
              key={req}
              className="inline-block px-3 py-1.5 rounded-lg bg-white/80 backdrop-blur-sm text-slate-700 text-xs font-medium border border-slate-200/60 shadow-sm hover:bg-slate-50 transition-colors"
            >
              {req}
            </span>
          ))}
          {job.requirements.length > 3 && (
            <span className="inline-flex items-center justify-center px-2.5 py-1.5 text-slate-500 text-xs font-semibold bg-slate-100/60 rounded-lg border border-slate-200/60">
              +{job.requirements.length - 3}
            </span>
          )}
        </div>

        {/* CTA Button Section */}
        <div className="mt-6 pt-6 border-t border-slate-200/60">
          {job.isExpired ? (
            <div className="block w-full text-center px-6 py-3.5 rounded-xl font-bold text-sm text-slate-500 bg-slate-100 border border-slate-200 cursor-not-allowed">
              Application closed
            </div>
          ) : canView ? (
            <div>
              <button
                type="button"
                onClick={handleApply}
                disabled={applying}
                className={`block w-full text-center px-6 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-70 ${
                  isFree
                    ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-sky-600 hover:from-indigo-600 hover:via-indigo-700 hover:to-sky-700 text-white shadow-indigo-500/25 hover:shadow-indigo-600/40'
                    : 'bg-gradient-to-r from-violet-500 via-violet-600 to-indigo-600 hover:from-violet-600 hover:via-violet-700 hover:to-indigo-700 text-white shadow-violet-500/25 hover:shadow-violet-600/40'
                }`}
              >
                <span className="flex items-center justify-center gap-2.5">
                  <span>{applying ? 'Applying…' : 'Apply Now'}</span>
                  <HiArrowRight className="w-4 h-4" />
                </span>
              </button>
            </div>
          ) : (
            <div>
              <Link
                to={pricingTo}
                className="block w-full text-center px-6 py-3.5 rounded-xl font-bold text-sm tracking-wide border-2 border-slate-300 text-slate-700 bg-white/90 backdrop-blur-sm hover:border-indigo-500 hover:text-indigo-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-violet-50 transition-all duration-300 shadow-sm hover:shadow-lg"
              >
                <span className="flex items-center justify-center gap-2.5">
                  <HiLockClosed className="w-4 h-4" />
                  <span>Unlock Position</span>
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function JobOpeningsSection() {
  const location = useLocation();
  const [hoveredId, setHoveredId] = useState(null);
  const [activeTab, setActiveTab] = useState('free');
  const [landingJobs, setLandingJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const isAuthenticated = useAppSelector((state) => !!state.auth.user);
  const pricingTo = `/pricing?from=${encodeURIComponent(location.pathname || '/')}`;

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
    const fetch = async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, company_name, location, audience_tracks, allowed_plans, application_deadline, walk_in_date, address, apply_link')
        .eq('show_on_landing', true);
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
    fetch();
  }, []);

  const filteredJobs = useMemo(() => landingJobs.filter(job =>
    activeTab === 'free' ? job.isFree : !job.isFree
  ), [landingJobs, activeTab]);

  // When there are no jobs at all, show a different section (Connect + illustration) instead of empty white space
  if (!loading && landingJobs.length === 0) {
    return <NoJobsConnectSection />;
  }

  return (
    <section
      id="job-openings"
      className="relative bg-gradient-to-b from-slate-50 via-white to-slate-50/30 py-12 sm:py-14 md:py-16 overflow-hidden"
    >
      {/* Sophisticated Background Pattern */}
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgb(148 163 184 / 0.15) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }} />
      </div>

      {/* Static ambient gradients - theme indigo/violet/sky */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-violet-300/15 via-indigo-200/10 to-transparent blur-2xl" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-indigo-300/15 via-sky-200/10 to-transparent blur-2xl" />
      </div>

      <SectionContainer useGrid>
        {/* Header Section */}
        <div className="col-span-full text-center mb-10 px-4">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/60 text-slate-700 text-xs sm:text-sm font-bold mb-4 sm:mb-5 shadow-lg shadow-slate-200/50">
            <span className="relative flex h-2.5 w-2.5">
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
            Currently Hiring
          </div>

          {/* Main Heading */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-3 sm:mb-4 leading-[1.1] px-4">
            <span className="text-slate-900">Find your next</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600">
              career opportunity
            </span>
          </h2>

          {/* Subheading */}
          <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium px-4">
            Hand-picked positions from innovative companies.
            <br className="hidden sm:block" />
            <span className="block sm:inline"> Your perfect role is waiting.</span>
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="col-span-full flex justify-center mb-8 px-4">
          <div className="relative inline-flex p-1.5 sm:p-2 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-lg shadow-slate-200/50 w-full max-w-md sm:w-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/50 via-transparent to-violet-50/50 rounded-2xl opacity-60" />
            {['free', 'premium'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`relative z-10 flex-1 sm:flex-initial px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm font-bold transition-colors duration-200 capitalize sm:min-w-[140px] ${
                  activeTab === tab
                    ? tab === 'free'
                      ? 'text-indigo-700'
                      : 'text-violet-700'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {activeTab === tab && (
                  <div
                    className={`absolute inset-0 rounded-xl shadow-md ${
                      tab === 'free'
                        ? 'bg-gradient-to-br from-indigo-100 to-sky-100 border border-indigo-200/60'
                        : 'bg-gradient-to-br from-violet-100 to-indigo-100 border border-violet-200/60'
                    }`}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {tab === 'free' ? (
                    <HiSparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <HiBriefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                  <span className="whitespace-nowrap">{tab} Jobs</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Jobs Grid */}
        <div className="col-span-full px-4 sm:px-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <PageLoader size="lg" label="Loading jobs…" variant="dots" />
            </div>
          ) : (
          <div
            key={activeTab}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6"
          >
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  hoveredId={hoveredId}
                  setHoveredId={setHoveredId}
                  isAuthenticated={isAuthenticated}
                  pricingTo={pricingTo}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12 sm:py-16 px-4">
                <div className="inline-flex flex-col items-center gap-4 p-6 sm:p-8 rounded-2xl bg-white/60 backdrop-blur-sm border border-slate-200/60 max-w-md mx-auto">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-100 flex items-center justify-center">
                    <HiBriefcase className="w-7 h-7 sm:w-8 sm:h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-600 text-base sm:text-lg font-medium">
                    No {activeTab} positions available right now
                  </p>
                  <p className="text-slate-500 text-sm">
                    Check back soon for new opportunities
                  </p>
                </div>
              </div>
            )}
          </div>
          )}
        </div>

        {/* View All Link */}
        <div className="col-span-full text-center mt-8 px-4">
          <Link
            to="/dashboard/jobs"
            className="inline-flex items-center gap-2.5 text-slate-600 hover:text-indigo-600 font-semibold text-sm sm:text-base transition-colors duration-200 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:bg-indigo-50/50"
          >
            <span>Explore all positions</span>
            <HiArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>
        </div>
      </SectionContainer>
    </section>
  );
}