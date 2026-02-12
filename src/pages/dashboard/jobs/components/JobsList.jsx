import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HiMagnifyingGlass, 
  HiMapPin, 
  HiBriefcase, 
  HiBuildingOffice2, 
  HiClock, 
  HiBookmark,
  HiOutlineBookmark
} from 'react-icons/hi2';

export default function JobsList({ jobs }) {
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
      {/* --- Search & Filter Bar --- */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-[rgb(var(--nth-border-light))] shadow-sm">
        <div className="relative flex-1">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgb(var(--nth-text-muted-light))]" />
          <input
            type="text"
            placeholder="Search by role or company..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[rgb(var(--nth-bg-soft))] border-transparent focus:bg-white focus:border-[rgb(var(--nth-primary))] focus:ring-2 focus:ring-[rgb(var(--nth-primary))]/20 transition-all outline-none text-[rgb(var(--nth-text-primary-light))]"
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
                  ? 'bg-[rgb(var(--nth-primary))] text-white border-[rgb(var(--nth-primary))]'
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
              <JobCard key={job.id} job={job} />
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

function JobCard({ job }) {
  const [isSaved, setIsSaved] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group relative bg-white rounded-xl p-5 border border-[rgb(var(--nth-border-light))] hover:border-[rgb(var(--nth-primary))]/30 hover:shadow-lg hover:shadow-[rgb(var(--nth-primary))]/5 transition-all"
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
              <h3 className="text-lg font-bold text-[rgb(var(--nth-text-primary-light))] group-hover:text-[rgb(var(--nth-primary))] transition-colors">
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
                <HiBookmark className="w-5 h-5 text-[rgb(var(--nth-primary))]" />
              ) : (
                <HiOutlineBookmark className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-[rgb(var(--nth-text-secondary-light))]">
            <div className="flex items-center gap-1.5">
              <HiMapPin className="w-4 h-4 text-[rgb(var(--nth-text-muted-light))]" />
              {job.location}
            </div>
            <div className="flex items-center gap-1.5">
              <HiBriefcase className="w-4 h-4 text-[rgb(var(--nth-text-muted-light))]" />
              {job.type}
            </div>
            <div className="flex items-center gap-1.5">
              <HiClock className="w-4 h-4 text-[rgb(var(--nth-text-muted-light))]" />
              {job.postedAt}
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="pt-4 sm:pt-0 sm:self-center flex shrink-0">
          <button className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[rgb(var(--nth-primary))] hover:bg-[rgb(var(--nth-primary-light))] text-white font-medium text-sm transition-all shadow-sm shadow-[rgb(var(--nth-primary))]/30">
            Apply Now
          </button>
        </div>
      </div>
    </motion.div>
  );
}
