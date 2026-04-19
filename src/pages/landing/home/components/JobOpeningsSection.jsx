import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HiMapPin, HiLockClosed, HiBriefcase, HiArrowRight, HiOutlineBookmark } from 'react-icons/hi2';
import SectionContainer from '../../../../components/SectionContainer';
import { PageLoader } from '../../../../components/ui/Loader';
import { useState, useEffect, useMemo } from 'react';
import { useAppSelector } from '../../../../store/hooks';
import { supabase } from '../../../../lib/supabase';

function JobCard({ job, isAuthenticated, pricingTo }) {
  const navigate = useNavigate();
  const isFree = job.isFree;
  const canView = isFree || isAuthenticated;
  const [applying, setApplying] = useState(false);

  const handleApply = async () => {
    if (job.isExpired || applying) return;

    const rawLink = job.applyLink && String(job.applyLink).trim();
    if (rawLink?.startsWith('http')) {
      window.open(rawLink, '_blank', 'noopener,noreferrer');
      return;
    }

    // Free roles: public apply on the job page (guests were wrongly sent to /dashboard/jobs).
    if (job.isFree) {
      navigate(`/jobs/${job.id}`);
      return;
    }

    if (!isAuthenticated) return;

    setApplying(true);
    const { data } = await supabase.rpc('record_application', { p_job_id: job.id });
    setApplying(false);
    if (data?.ok) {
      if (rawLink?.startsWith('/')) {
        navigate(rawLink);
      } else {
        navigate('/dashboard/jobs');
      }
    } else {
      navigate(`/jobs/${job.id}`);
    }
  };

  return (
    <article className="group flex flex-col bg-white rounded-[16px] p-6 sm:p-7 border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 relative h-full">
      
      {/* Top row: Title and Badge/Bookmark */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
           <Link to={canView ? `/jobs/${job.id}` : pricingTo} className="inline-block">
             <h3 className="text-[19px] sm:text-[21px] font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">
               {job.title}
             </h3>
           </Link>
           {/* Company Info directly under title */}
           <div className="flex items-center gap-2.5 mt-3">
             <div className="w-7 h-7 rounded bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
               <span className="text-[12px] font-extrabold text-slate-700 leading-none">
                 {job.company.charAt(0).toUpperCase()}
               </span>
             </div>
             <span className="text-[14px] font-semibold text-slate-800">{job.company}</span>
           </div>
        </div>

        <div className="flex flex-col items-end gap-2.5 shrink-0 pt-1">
          <button type="button" className="text-slate-300 hover:text-indigo-600 transition-colors" aria-label="Bookmark">
            <HiOutlineBookmark className="w-5 h-5" />
          </button>
          {isFree ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold uppercase tracking-wide">
              Free Tier
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-100 text-[10px] font-bold uppercase tracking-wide">
              Premium
            </span>
          )}
        </div>
      </div>

      {/* Meta Data aligned neatly */}
      <div className="flex flex-wrap items-center gap-y-3 gap-x-5 mb-5 mt-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <HiMapPin className="w-4 h-4 text-slate-400" />
          {job.city || 'Remote'}
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <HiBriefcase className="w-4 h-4 text-slate-400" />
          {job.experience}
        </div>
        {job.applicationDeadline && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
             <span className="flex items-center justify-center shrink-0">
               <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
             </span>
             Apply by {job.applicationDeadline}
          </div>
        )}
      </div>

      {/* Tags */}
      {job.requirements?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6 mt-auto">
          {job.requirements.slice(0, 3).map(req => (
            <span key={req} className="px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-100 rounded-md text-[11px] font-semibold">
              {req}
            </span>
          ))}
          {job.requirements.length > 3 && (
            <span className="px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-100 rounded-md text-[11px] font-semibold">
              +{job.requirements.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Action */}
      <div className="pt-5 border-t border-slate-100 mt-auto">
        {job.isExpired ? (
          <button disabled className="w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-slate-400 bg-slate-50 border border-slate-200 rounded-[10px] cursor-not-allowed">
            Applications Closed
          </button>
        ) : canView ? (
          <button
            onClick={(e) => { e.preventDefault(); handleApply(); }}
            disabled={applying}
            className="w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-[12px] shadow-sm shadow-indigo-600/20 transition-all focus:ring-4 focus:ring-indigo-100 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {applying ? 'Applying...' : 'Apply Now'}
          </button>
        ) : (
          <Link
            to={pricingTo}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-indigo-700 bg-white border-2 border-indigo-100 hover:bg-indigo-50 rounded-[12px] shadow-sm transition-all focus:ring-4 focus:ring-indigo-50"
          >
            <HiLockClosed className="w-4 h-4 text-indigo-500" />
            Unlock Position
          </Link>
        )}
      </div>
    </article>
  );
}

export default function JobOpeningsSection({
  previewLimit = null,
  viewAllTo = null,
  hideWhenEmpty = true,
} = {}) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('free');
  const [landingJobs, setLandingJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const isAuthenticated = useAppSelector((state) => !!state.auth.user);
  const pricingTo = `/pricing?from=${encodeURIComponent(location.pathname || '/')}`;

  useEffect(() => {
    const formatDate = (dateStr) => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      // More professional format: e.g. "2 days ago" simulation or clean "Apr 19"
      return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
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
            company: j.company_name ?? 'Confidential',
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

  // Derived empty states
  if (!loading && landingJobs.length === 0 && hideWhenEmpty) {
    return null;
  }

  return (
    <section id="job-openings" className="bg-gradient-to-b from-slate-50/50 to-white py-20 sm:py-28 font-sans border-t border-slate-100">
      <SectionContainer className="max-w-[1100px] mx-auto px-4 sm:px-6">
        
        {/* Top Hero Section */}
        <div className="text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50/80 border border-indigo-100 mb-6 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="text-sm font-semibold text-indigo-700 tracking-wide">Actively Hiring</span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
            Open <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Positions</span>
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
            Explore curated roles from top organizations. Find your next career move and apply immediately.
          </p>

          {/* Filter Chips */}
          {showTabSelector && (
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              {['free', 'premium'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 capitalize ${
                    activeTab === tab
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {tab === 'free' ? 'All Free Tier' : 'Premium Only'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid Container */}
        <div className="w-full">
          {loading ? (
             <div className="flex justify-center py-20">
               <PageLoader size="lg" label="Loading opportunities…" variant="dots" />
             </div>
          ) : landingJobs.length === 0 ? (
             <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-5 border border-slate-100">
                  <HiBriefcase className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">No positions available</h3>
                <p className="text-slate-500 mt-2">There are currently no openings listed. Please check back later.</p>
             </div>
          ) : displayJobs.length > 0 ? (
             <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 ${
               displayJobs.length <= 4 ? 'max-w-4xl mx-auto' : 'w-full'
             }`}>
               {displayJobs.map(job => (
                 <JobCard 
                   key={job.id} 
                   job={job} 
                   isAuthenticated={isAuthenticated} 
                   pricingTo={pricingTo} 
                 />
               ))}
             </div>
          ) : (
             <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-[24px] border border-slate-100 shadow-sm max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-slate-50 rounded-[18px] flex items-center justify-center mb-5 border border-slate-100">
                  <HiBriefcase className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">No {activeTab} positions found</h3>
                <p className="text-slate-500 mt-2">Try switching filters or check back later.</p>
             </div>
          )}
        </div>

        {/* View All */}
        {showViewAll && (
           <div className="mt-14 flex justify-center">
             <Link 
               to={viewAllTo}
               className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm focus:ring-4 focus:ring-slate-100"
             >
               View all positions
               <HiArrowRight className="w-4 h-4" />
             </Link>
           </div>
        )}

      </SectionContainer>
    </section>
  );
}