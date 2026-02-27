import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
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

export default function JobsList({ jobs, usage, appliedJobIds, onUsageChange }) {
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
    <div className="space-y-6">
      {/* Application usage (when subscription active and limit is finite) */}
      {usage?.active && usage.limit >= 0 && (
        <p className="text-sm text-[rgb(var(--nth-text-secondary-light))]">
          Applications this month: <span className="font-medium text-[rgb(var(--nth-text-primary-light))]">{usage.used}</span> of {usage.limit}
        </p>
      )}

      {/* --- Search & Filter Bar --- */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-[rgb(var(--nth-border-light))] shadow-sm">
        <div className="relative flex-1">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgb(var(--nth-text-muted-light))]" />
          <input
            type="text"
            placeholder="Search by role or company..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[rgb(var(--nth-bg-soft))] border-transparent focus:bg-white focus:border-[hsl(var(--nth-primary))] focus:ring-2 focus:ring-[hsl(var(--nth-primary))]/20 transition-all outline-none text-[rgb(var(--nth-text-primary-light))]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
          {['All', 'Full-time', 'Contract', 'Remote'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border ${
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

function JobCard({ job, usage, isApplied, onApplicationRecorded }) {
  const [isSaved, setIsSaved] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState(null);

  const atLimit = usage?.active && usage.limit >= 0 && usage.used >= usage.limit;

  const handleApply = async () => {
    if (job.isExpired || applying || isApplied) return;
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group relative bg-white rounded-xl p-5 border border-[rgb(var(--nth-border-light))] hover:border-[hsl(var(--nth-primary))]/30 hover:shadow-lg hover:shadow-[hsl(var(--nth-primary))]/5 transition-all"
    >
      <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
        {/* Logo Placeholder */}
        <div className="w-12 h-12 rounded-lg bg-[rgb(var(--nth-bg-soft))] flex items-center justify-center shrink-0 text-[rgb(var(--nth-text-muted-light))] group-hover:bg-[rgb(var(--nth-bg-info))] group-hover:text-[rgb(var(--nth-info))] transition-colors">
          <HiBuildingOffice2 className="w-6 h-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-[rgb(var(--nth-text-primary-light))] group-hover:text-[hsl(var(--nth-primary))] transition-colors">
                {job.title}
              </h3>
              <p className="text-sm font-medium text-[rgb(var(--nth-text-secondary-light))] mb-0.5">
                {job.company}
              </p>
            </div>
            
            {/* Save Button */}
            <button 
              onClick={() => setIsSaved(!isSaved)}
              className="p-1.5 rounded-full hover:bg-[rgb(var(--nth-bg-soft))] text-[rgb(var(--nth-text-muted-light))] transition-colors"
            >
              {isSaved ? (
                <HiBookmark className="w-5 h-5 text-[hsl(var(--nth-primary))]" />
              ) : (
                <HiOutlineBookmark className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-[rgb(var(--nth-text-secondary-light))]">
            {job.location && job.location !== '—' && (
              <div className="flex items-center gap-1.5">
                <HiMapPin className="w-4 h-4 text-[rgb(var(--nth-text-muted-light))]" />
                {job.location}
              </div>
            )}
            {job.experience && (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {job.experience}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <HiBriefcase className="w-4 h-4 text-[rgb(var(--nth-text-muted-light))]" />
              {job.type}
            </div>
            <div className="flex items-center gap-1.5">
              <HiClock className="w-4 h-4 text-[rgb(var(--nth-text-muted-light))]" />
              {job.postedAt}
            </div>
            {job.applicationDeadline && (
              <div className="flex items-center gap-1.5">
                <HiCalendarDays className="w-4 h-4 text-[rgb(var(--nth-text-muted-light))]" />
                Apply by {job.applicationDeadline}
              </div>
            )}
          </div>
          {job.walkInDate && (
            <p className="mt-2 text-sm text-[rgb(var(--nth-text-secondary-light))]">
              <span className="font-medium">Walk-in:</span> {job.walkInDate}
            </p>
          )}
          {job.address && (
            <p className="mt-1 text-sm text-[rgb(var(--nth-text-secondary-light))] truncate" title={job.address}>
              <span className="font-medium">Address:</span> {job.address}
            </p>
          )}
        </div>

        {/* Action */}
        <div className="pt-4 sm:pt-0 sm:self-center flex shrink-0 flex-col items-end gap-1">
          {applyError && (
            <p className="text-sm text-red-600 max-w-[200px] text-right">
              {applyError}
              {applyError.includes('Upgrade') && (
                <Link to="/pricing" className="block mt-1 text-[hsl(var(--nth-primary))] font-medium">
                  Upgrade plan
                </Link>
              )}
            </p>
          )}
          {job.isExpired ? (
            <span className="inline-block px-5 py-2.5 rounded-lg bg-slate-200 text-slate-500 font-medium text-sm cursor-not-allowed">
              Application closed
            </span>
          ) : isApplied ? (
            <span className="inline-block px-5 py-2.5 rounded-lg bg-emerald-100 text-emerald-700 font-medium text-sm">
              Applied
            </span>
          ) : atLimit ? (
            <Link
              to="/pricing"
              className="inline-block w-full sm:w-auto text-center px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm transition-all"
            >
              Limit reached – Upgrade
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleApply}
              disabled={applying}
              className="nth-btn-primary inline-block w-full sm:w-auto text-center px-5 py-2.5 text-sm font-medium disabled:opacity-70 disabled:transform-none"
            >
              {applying ? 'Applying…' : 'Apply Now'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
