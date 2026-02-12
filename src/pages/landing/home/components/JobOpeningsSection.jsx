import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { HiMapPin, HiUser, HiBriefcase, HiSparkles, HiArrowRight, HiLockClosed } from 'react-icons/hi2';
import SectionContainer from '../../../../components/SectionContainer';
import { landingJobs } from '../../data/landingJobs';
import { useState } from 'react';
import { useAppSelector } from '../../../../store/hooks';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

function JobCard({ job, hoveredId, setHoveredId, isAuthenticated }) {
  const isFree = job.isFree;
  const isHovered = hoveredId === job.id;
  // Logic: Show details if it's free OR if user is authenticated (assuming auth = premium access for this demo)
  const canView = isFree || isAuthenticated;

  return (
    <motion.article
      variants={itemVariants}
      className={`relative group rounded-3xl p-6 transition-all duration-300 flex flex-col h-full border ${
        isHovered 
          ? 'bg-white shadow-2xl shadow-indigo-500/10 border-indigo-100 scale-[1.02] z-10' 
          : 'bg-white/60 border-slate-200 hover:border-indigo-100'
      }`}
      onMouseEnter={() => setHoveredId(job.id)}
      onMouseLeave={() => setHoveredId(null)}
    >
      {/* Badge */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-wrap gap-2">
            {isFree ? (
             <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold uppercase tracking-wider">
               <HiSparkles className="w-3.5 h-3.5" /> Free
             </span>
            ) : (
             <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-bold uppercase tracking-wider">
               Premium
             </span>
            )}
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">
                {job.experience}
            </span>
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-[rgb(var(--nth-primary))] transition-colors">
        {job.title}
      </h3>
      
      <div className="mb-6">
          {canView ? (
            <p className="text-sm font-medium text-slate-600">{job.company}</p>
          ) : (
            <p className="text-sm text-slate-400 italic flex items-center gap-1">
              <HiLockClosed className="w-3 h-3" /> Company hidden
            </p>
          )}
           <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
            <HiMapPin className="w-4 h-4" />
            {job.city}
          </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 mt-auto">
        {job.requirements.slice(0, 3).map((req) => (
          <span
            key={req}
            className="inline-block px-3 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs font-medium border border-slate-100"
          >
            {req}
          </span>
        ))}
        {job.requirements.length > 3 && (
             <span className="inline-block px-2 py-1 text-slate-400 text-xs font-medium">+{job.requirements.length - 3}</span>
        )}
      </div>

      <div className="pt-4 border-t border-slate-100/50">
        {canView ? (
          <Link
            to={job.applyLink || '/dashboard/jobs'}
            className="w-full nth-btn-primary inline-flex items-center justify-center gap-2 text-sm py-3 px-4 rounded-xl font-semibold opacity-90 group-hover:opacity-100 transition-all hover:text-white"
          >
            Apply Now
            <HiArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        ) : (
          <Link
            to={pricingTo}
            className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold py-3 px-4 rounded-xl border border-slate-200 text-slate-600 bg-white group-hover:border-[rgb(var(--nth-primary))] group-hover:text-[rgb(var(--nth-primary))] transition-all"
          >
            Unlock & Apply
             <HiLockClosed className="w-4 h-4" />
          </Link>
        )}
      </div>
    </motion.article>
  );
}

export default function JobOpeningsSection() {
  const location = useLocation();
  const [hoveredId, setHoveredId] = useState(null);
  const isAuthenticated = useAppSelector((state) => !!state.auth.user);
  const pricingTo = `/pricing?from=${encodeURIComponent(location.pathname || '/')}`;

  return (
    <section
      id="job-openings"
      className="relative bg-slate-50/50 py-24 sm:py-32 overflow-hidden"
    >
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-100/40 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-blue-100/40 rounded-full blur-[80px]" />
      </div>

      <SectionContainer useGrid>
        <motion.div
          className="col-span-full text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-semibold mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Actively Hiring
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            <span className="text-slate-900">Discover your next </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">big move</span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Curated opportunities from top companies. Whether you're starting out or stepping up, find the role that fits.
          </p>
        </motion.div>

        <motion.div
          className="col-span-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {landingJobs.map((job) => (
            <JobCard 
                key={job.id} 
                job={job} 
                hoveredId={hoveredId} 
                setHoveredId={setHoveredId}
                isAuthenticated={isAuthenticated}
            />
          ))}
        </motion.div>
      </SectionContainer>
    </section>
  );
}
