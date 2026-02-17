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

import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { HiMapPin, HiSparkles, HiArrowRight, HiLockClosed, HiBriefcase } from 'react-icons/hi2';
import SectionContainer from '../../../../components/SectionContainer';
import { PageLoader } from '../../../../components/ui/Loader';
import { useState, useEffect, useMemo } from 'react';
import { useAppSelector } from '../../../../store/hooks';
import { supabase } from '../../../../lib/supabase';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { 
      staggerChildren: 0.08,
      delayChildren: 0.15
    },
  },
};

const itemVariants = {
  hidden: { 
    y: 30, 
    opacity: 0,
    scale: 0.95
  },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { 
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1]
    },
  },
  exit: {
    y: -20,
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.3
    }
  }
};

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
    <motion.article
      variants={itemVariants}
      layout
      className={`relative group rounded-2xl overflow-hidden transition-all duration-500 flex flex-col h-full ${
        isHovered 
          ? 'shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]' 
          : 'shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_15px_45px_-12px_rgba(0,0,0,0.12)]'
      }`}
      onMouseEnter={() => setHoveredId(job.id)}
      onMouseLeave={() => setHoveredId(null)}
      whileHover={{ y: -4 }}
    >
      {/* Animated Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-500 ${
        isFree 
          ? 'from-emerald-50 via-white to-teal-50/30' 
          : 'from-violet-50 via-white to-indigo-50/30'
      } ${isHovered ? 'opacity-100' : 'opacity-70'}`} />
      
      {/* Shimmer Effect on Hover */}
      <motion.div 
        className={`absolute inset-0 bg-gradient-to-r ${
          isFree 
            ? 'from-transparent via-emerald-100/40 to-transparent' 
            : 'from-transparent via-violet-100/40 to-transparent'
        }`}
        initial={{ x: '-100%' }}
        animate={{ x: isHovered ? '100%' : '-100%' }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      />

      {/* Border Glow */}
      <div className={`absolute inset-0 rounded-2xl transition-opacity duration-500 ${
        isFree
          ? 'ring-1 ring-emerald-200/60'
          : 'ring-1 ring-violet-200/60'
      } ${isHovered ? 'ring-2' : ''}`} />

      <div className="relative z-10 p-5 sm:p-6 lg:p-7 flex flex-col h-full">
        {/* Header with Badges */}
        <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
          <div className="flex flex-wrap gap-2">
            {isFree ? (
              <motion.span 
                className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-emerald-200/50"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <HiSparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> 
                <span className="hidden xs:inline">Free</span>
                <span className="inline xs:hidden">F</span>
              </motion.span>
            ) : (
              <motion.span 
                className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-violet-200/50"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <HiBriefcase className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> 
                <span className="hidden xs:inline">Premium</span>
                <span className="inline xs:hidden">Pro</span>
              </motion.span>
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
                isFree ? 'bg-emerald-500' : 'bg-violet-500'
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
          {job.requirements.slice(0, 3).map((req, idx) => (
            <motion.span
              key={req}
              className="inline-block px-3 py-1.5 rounded-lg bg-white/80 backdrop-blur-sm text-slate-700 text-xs font-medium border border-slate-200/60 shadow-sm"
              whileHover={{ 
                scale: 1.05, 
                backgroundColor: 'rgb(248 250 252)',
                borderColor: isFree ? 'rgb(16 185 129 / 0.3)' : 'rgb(139 92 246 / 0.3)'
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              {req}
            </motion.span>
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
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <button
                type="button"
                onClick={handleApply}
                disabled={applying}
                className={`block w-full text-center px-6 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-70 ${
                  isFree
                    ? 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/25 hover:shadow-emerald-600/40'
                    : 'bg-gradient-to-r from-violet-500 via-violet-600 to-indigo-600 hover:from-violet-600 hover:via-violet-700 hover:to-indigo-700 text-white shadow-violet-500/25 hover:shadow-violet-600/40'
                }`}
              >
                <span className="flex items-center justify-center gap-2.5">
                  <span>{applying ? 'Applying…' : 'Apply Now'}</span>
                  <motion.span initial={{ x: 0 }} whileHover={{ x: 4 }} transition={{ duration: 0.3, ease: "easeOut" }}>
                    <HiArrowRight className="w-4 h-4" />
                  </motion.span>
                </span>
              </button>
            </motion.div>
          ) : (
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Link
                to={pricingTo}
                className="block w-full text-center px-6 py-3.5 rounded-xl font-bold text-sm tracking-wide border-2 border-slate-300 text-slate-700 bg-white/90 backdrop-blur-sm hover:border-violet-500 hover:text-violet-700 hover:bg-gradient-to-r hover:from-violet-50 hover:to-indigo-50 transition-all duration-300 shadow-sm hover:shadow-lg"
              >
                <span className="flex items-center justify-center gap-2.5">
                  <HiLockClosed className="w-4 h-4" />
                  <span>Unlock Position</span>
                </span>
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </motion.article>
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

  return (
    <section
      id="job-openings"
      className="relative bg-gradient-to-b from-slate-50 via-white to-slate-50/30 py-16 sm:py-20 lg:py-24 xl:py-32 overflow-hidden"
    >
      {/* Sophisticated Background Pattern */}
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgb(148 163 184 / 0.15) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }} />
      </div>

      {/* Animated Ambient Gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] rounded-full bg-gradient-to-br from-violet-300/20 via-indigo-200/15 to-transparent blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            rotate: [0, 90, 0]
          }}
          transition={{ 
            duration: 20, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
        <motion.div 
          className="absolute -bottom-[20%] -left-[10%] w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-emerald-300/20 via-teal-200/15 to-transparent blur-3xl"
          animate={{ 
            scale: [1, 1.15, 1],
            opacity: [0.25, 0.45, 0.25],
            rotate: [0, -90, 0]
          }}
          transition={{ 
            duration: 18, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>

      <SectionContainer useGrid>
        {/* Header Section */}
        <motion.div
          className="col-span-full text-center mb-16 px-4"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Status Badge */}
          <motion.div 
            className="inline-flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/60 text-slate-700 text-xs sm:text-sm font-bold mb-6 sm:mb-8 shadow-lg shadow-slate-200/50"
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.05 }}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            Currently Hiring
          </motion.div>

          {/* Main Heading */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-4 sm:mb-6 leading-[1.1] px-4">
            <span className="text-slate-900">Find your next</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 animate-gradient">
              career opportunity
            </span>
          </h2>

          {/* Subheading */}
          <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium px-4">
            Hand-picked positions from innovative companies.
            <br className="hidden sm:block" />
            <span className="block sm:inline"> Your perfect role is waiting.</span>
          </p>
        </motion.div>

        {/* Enhanced Tab Toggle */}
        <motion.div 
          className="col-span-full flex justify-center mb-14 px-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="relative inline-flex p-1.5 sm:p-2 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-lg shadow-slate-200/50 w-full max-w-md sm:w-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-50/50 via-transparent to-emerald-50/50 rounded-2xl opacity-60" />
            
            {['free', 'premium'].map((tab) => (
              <motion.button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative z-10 flex-1 sm:flex-initial px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 capitalize sm:min-w-[140px] ${
                  activeTab === tab 
                    ? tab === 'free'
                      ? 'text-emerald-700'
                      : 'text-violet-700'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                whileHover={{ scale: activeTab !== tab ? 1.02 : 1 }}
                whileTap={{ scale: 0.98 }}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTab"
                    className={`absolute inset-0 rounded-xl shadow-md ${
                      tab === 'free'
                        ? 'bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200/60'
                        : 'bg-gradient-to-br from-violet-100 to-indigo-100 border border-violet-200/60'
                    }`}
                    transition={{ 
                      type: "spring", 
                      stiffness: 350, 
                      damping: 30 
                    }}
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
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Jobs Grid */}
        <div className="col-span-full px-4 sm:px-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <PageLoader size="lg" label="Loading jobs…" variant="dots" />
            </div>
          ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
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
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -20 }}
                  className="col-span-full text-center py-16 sm:py-24 px-4"
                >
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
</motion.div>
          )}
            </motion.div>
          </AnimatePresence>
          )}
        </div>

        {/* View All Link */}
        <motion.div 
          className="col-span-full text-center mt-12 sm:mt-16 px-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <Link 
            to="/dashboard/jobs" 
            className="inline-flex items-center gap-2.5 text-slate-600 hover:text-violet-600 font-semibold text-sm sm:text-base transition-all duration-300 group px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:bg-violet-50/50"
          >
            <span>Explore all positions</span>
            <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <HiArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.span>
          </Link>
        </motion.div>
      </SectionContainer>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </section>
  );
}