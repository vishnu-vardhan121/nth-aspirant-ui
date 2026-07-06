import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HiMagnifyingGlass, 
  HiMapPin, 
  HiBriefcase, 
  HiBuildingOffice2, 
  HiClock, 
  HiCalendarDays,
  HiBookmark,
  HiOutlineBookmark
} from 'react-icons/hi2';
import { supabase } from '../../../../lib/supabase';
import { usePlanModal, useSubscriptionStatus } from '../../subscription';
import { useProfileOnboardingGate } from '../../hooks/useProfileOnboardingGate';

export default function JobsList({ jobs, usage, appliedJobIds, applicationStatusByJobId = {}, onUsageChange }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All'); // All, Full-time, Contract, etc.
  
  // -- Filter Logic --
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'All' || job.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [jobs, searchQuery, filterType]);

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {/* Application usage (when subscription active and limit is finite) */}
      {usage?.active && usage.limit >= 0 && (
        <p className="text-xs sm:text-sm text-[rgb(var(--nth-text-secondary-light))]">
          Applications this month:{' '}
          <span className="font-medium text-[rgb(var(--nth-text-primary-light))]">{usage.used}</span> of {usage.limit}
        </p>
      )}

      {/* --- Search & Filter Bar --- */}
      <div className="flex flex-col gap-3 sm:gap-4 bg-white p-3 sm:p-4 rounded-xl border border-[rgb(var(--nth-border-light))] shadow-sm min-w-0">
        <div className="relative flex-1 min-w-0">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgb(var(--nth-text-muted-light))] pointer-events-none" />
          <input
            type="search"
            placeholder="Search role or company"
            className="w-full min-w-0 pl-10 pr-4 py-2.5 rounded-lg bg-[rgb(var(--nth-bg-soft))] border-transparent focus:bg-white focus:border-[hsl(var(--nth-primary))] focus:ring-2 focus:ring-[hsl(var(--nth-primary))]/20 transition-all outline-none text-sm sm:text-base text-[rgb(var(--nth-text-primary-light))]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0 md:pb-0 md:flex-wrap md:overflow-visible">
          {['All', 'Full-time', 'Contract', 'Remote'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`shrink-0 snap-start px-3.5 sm:px-4 py-2 min-h-[40px] rounded-lg text-sm font-medium whitespace-nowrap transition-colors border ${
                filterType === type
                  ? 'bg-[hsl(var(--nth-primary))] text-white border-[hsl(var(--nth-primary))]'
                  : 'bg-white text-[rgb(var(--nth-text-secondary-light))] border-[rgb(var(--nth-border-light))] hover:bg-[rgb(var(--nth-bg-soft))]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* --- Job List --- */}
      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                usage={usage}
                isApplied={appliedJobIds?.has(job.id)}
                applicationStatus={applicationStatusByJobId?.[job.id]}
                onApplicationRecorded={onUsageChange}
              />
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-center py-12 bg-white rounded-xl border border-dashed border-[rgb(var(--nth-border-light))]"
            >
              <p className="text-[rgb(var(--nth-text-muted-light))]">No jobs found matching your criteria.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function JobCard({ job, usage, isApplied, applicationStatus, onApplicationRecorded }) {
  const [isSaved, setIsSaved] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState(null);
  const { openPlanModal } = usePlanModal();
  const { canUpgrade } = useSubscriptionStatus();
  const { profileComplete, goToOnboarding } = useProfileOnboardingGate();

  const needsPlan = !usage?.active;
  const atLimit = usage?.active && usage.limit >= 0 && usage.used >= usage.limit;
  const showUpgradeAction =
    applyError &&
    (needsPlan || canUpgrade) &&
    (/upgrade/i.test(applyError) || /subscription/i.test(applyError) || /limit/i.test(applyError));

  const handleApply = async () => {
    if (job.isExpired || applying || isApplied) return;
    if (!profileComplete) {
      goToOnboarding();
      return;
    }
    if (needsPlan) {
      openPlanModal();
      return;
    }
    if (atLimit) {
      setApplyError('Application limit reached this month. Upgrade your plan for more.');
      return;
    }
    setApplying(true);
    setApplyError(null);
    const { data, error } = await supabase.rpc('record_application', { p_job_id: job.id });
    setApplying(false);
    if (error) {
      setApplyError(error.message || 'Failed to record application.');
      return;
    }
    const result = data ?? {};
    if (!result.ok) {
      setApplyError(result.error || 'Could not record application.');
      return;
    }
    onApplicationRecorded?.();
    if (job.applyLink) {
      window.open(job.applyLink, '_blank', 'noopener,noreferrer');
    }
  };

  const metaPillClass =
    'inline-flex items-center gap-1.5 max-w-full rounded-lg border border-[rgb(var(--nth-border-light))] bg-[rgb(var(--nth-bg-soft))] px-2.5 py-1 text-xs text-[rgb(var(--nth-text-secondary-light))]';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative min-w-0 bg-white rounded-xl p-4 sm:p-5 border border-[rgb(var(--nth-border-light))] transition-all [@media(hover:hover)]:hover:border-[hsl(var(--nth-primary))]/30 [@media(hover:hover)]:hover:shadow-lg [@media(hover:hover)]:hover:shadow-[hsl(var(--nth-primary))]/5"
    >
      {/* Header: icon + title + save */}
      <div className="flex gap-3 min-w-0">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[rgb(var(--nth-bg-soft))] flex items-center justify-center shrink-0 text-[rgb(var(--nth-text-muted-light))] group-hover:bg-[rgb(var(--nth-bg-info))] group-hover:text-[rgb(var(--nth-info))] transition-colors">
          <HiBuildingOffice2 className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 pr-1">
              <h3 className="text-base sm:text-lg font-bold leading-snug text-[rgb(var(--nth-text-primary-light))] break-words group-hover:text-[hsl(var(--nth-primary))] transition-colors">
                {job.title}
              </h3>
              {job.company ? (
                <p className="mt-0.5 text-sm font-medium text-[rgb(var(--nth-text-secondary-light))] truncate">
                  {job.company}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setIsSaved(!isSaved)}
              aria-label={isSaved ? 'Remove bookmark' : 'Save job'}
              className="-mr-1 p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full hover:bg-[rgb(var(--nth-bg-soft))] text-[rgb(var(--nth-text-muted-light))] transition-colors shrink-0"
            >
              {isSaved ? (
                <HiBookmark className="w-5 h-5 text-[hsl(var(--nth-primary))]" />
              ) : (
                <HiOutlineBookmark className="w-5 h-5" />
              )}
            </button>
          </div>

          {job.snippet ? (
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[rgb(var(--nth-text-muted-light))] line-clamp-2">
              {job.snippet}
            </p>
          ) : null}
        </div>
      </div>

      {/* Meta pills */}
      <div className="mt-3 flex flex-wrap gap-2 min-w-0">
        {job.location && job.location !== '—' && (
          <span className={metaPillClass}>
            <HiMapPin className="w-3.5 h-3.5 shrink-0 text-[rgb(var(--nth-text-muted-light))]" />
            <span className="truncate">{job.location}</span>
          </span>
        )}
        {job.experience && (
          <span className="inline-flex items-center rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
            {job.experience}
          </span>
        )}
        <span className={metaPillClass}>
          <HiBriefcase className="w-3.5 h-3.5 shrink-0 text-[rgb(var(--nth-text-muted-light))]" />
          <span className="truncate">{job.type}</span>
        </span>
        <span className={metaPillClass}>
          <HiClock className="w-3.5 h-3.5 shrink-0 text-[rgb(var(--nth-text-muted-light))]" />
          <span className="whitespace-nowrap">{job.postedAt}</span>
        </span>
        {job.applicationDeadline && (
          <span className={metaPillClass}>
            <HiCalendarDays className="w-3.5 h-3.5 shrink-0 text-[rgb(var(--nth-text-muted-light))]" />
            <span className="truncate">Apply by {job.applicationDeadline}</span>
          </span>
        )}
      </div>

      {(job.walkInDate || job.address) && (
        <div className="mt-2.5 space-y-1 text-xs sm:text-sm text-[rgb(var(--nth-text-secondary-light))] min-w-0">
          {job.walkInDate && (
            <p>
              <span className="font-medium text-[rgb(var(--nth-text-primary-light))]">Walk-in:</span>{' '}
              {job.walkInDate}
            </p>
          )}
          {job.address && (
            <p className="break-words" title={job.address}>
              <span className="font-medium text-[rgb(var(--nth-text-primary-light))]">Address:</span>{' '}
              {job.address}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-[rgb(var(--nth-border-light))] sm:mt-3 sm:pt-0 sm:border-t-0 flex flex-col gap-2 w-full min-w-0 sm:items-end">
        {applyError && (
          <p className="w-full text-sm text-red-600 sm:max-w-[220px] sm:text-right">
            {applyError}
            {showUpgradeAction ? (
              <button
                type="button"
                onClick={() => openPlanModal()}
                className="block mt-1 text-[hsl(var(--nth-primary))] font-medium hover:underline sm:text-right"
              >
                {needsPlan ? 'Get a plan' : 'Upgrade plan'}
              </button>
            ) : null}
          </p>
        )}
        {job.isExpired ? (
          <span className="flex w-full sm:w-auto items-center justify-center px-5 py-2.5 min-h-[44px] rounded-lg bg-slate-200 text-slate-500 font-medium text-sm cursor-not-allowed">
            Application closed
          </span>
        ) : isApplied ? (
          <span
            className={`flex w-full sm:w-auto items-center justify-center px-5 py-2.5 min-h-[44px] rounded-lg font-medium text-sm ${
              applicationStatus === 'shortlisted'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {applicationStatus === 'shortlisted' ? 'Shortlisted' : 'Applied'}
          </span>
        ) : needsPlan ? (
          <button
            type="button"
            onClick={() => openPlanModal()}
            className="nth-btn-primary w-full sm:w-auto min-h-[44px] px-5 py-2.5 text-sm font-medium"
          >
            Get a plan
          </button>
        ) : !profileComplete ? (
          <button
            type="button"
            onClick={goToOnboarding}
            className="w-full sm:w-auto min-h-[44px] rounded-lg border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100"
          >
            Complete profile
          </button>
        ) : atLimit && canUpgrade ? (
          <button
            type="button"
            onClick={() => openPlanModal()}
            className="w-full sm:w-auto min-h-[44px] rounded-lg bg-amber-500 hover:bg-amber-600 px-5 py-2.5 text-sm font-medium text-white transition-all"
          >
            Limit reached – Upgrade
          </button>
        ) : atLimit ? (
          <span className="flex w-full sm:w-auto items-center justify-center min-h-[44px] px-5 py-2.5 rounded-lg bg-slate-100 text-slate-600 font-medium text-sm text-center">
            Monthly limit reached
          </span>
        ) : (
          <button
            type="button"
            onClick={handleApply}
            disabled={applying}
            className="nth-btn-primary w-full sm:w-auto min-h-[44px] px-5 py-2.5 text-sm font-medium disabled:opacity-70 disabled:transform-none"
          >
            {applying ? 'Applying…' : 'Apply Now'}
          </button>
        )}
      </div>
    </motion.div>
  );
}
