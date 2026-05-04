import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { HiMapPin, HiBriefcase, HiCalendarDays, HiBuildingOffice2, HiSparkles } from 'react-icons/hi2';
import { supabase } from '../../../lib/supabase';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import Seo from '../../../components/Seo';
import SectionContainer from '../../../components/SectionContainer';
import { PageLoader } from '../../../components/ui/Loader';
import FreeJobApplicationForm from './components/FreeJobApplicationForm';

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const trimText = (value, max = 155) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
};

/** Calendar compare in Asia/Kolkata, aligned with public SQL guards (deadline &lt; today = closed). */
const calendarTodayIST = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const isJobExpired = (deadlineStr) => {
  if (!deadlineStr) return false;
  const d = String(deadlineStr).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return d < calendarTodayIST();
  }
  const t = new Date(deadlineStr);
  if (isNaN(t.getTime())) return false;
  const onIST = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(t);
  return onIST < calendarTodayIST();
};

const toArray = (value) => {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      return toArray(JSON.parse(value));
    } catch {
      return [];
    }
  }
  if (typeof value === 'object') {
    const numericKeys = Object.keys(value)
      .filter((key) => /^\d+$/.test(key))
      .sort((a, b) => Number(a) - Number(b));
    if (numericKeys.length) return numericKeys.map((key) => value[key]);
  }
  return [];
};

const parseSpotlightPayload = (raw) => {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      return parseSpotlightPayload(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  if (typeof raw === 'object') {
    if (Array.isArray(raw.jobs)) return raw.jobs;
    if (typeof raw.jobs === 'string') {
      try {
        return parseSpotlightPayload({ ...raw, jobs: JSON.parse(raw.jobs) });
      } catch {
        return [];
      }
    }
    const numericKeys = Object.keys(raw)
      .filter((key) => /^\d+$/.test(key))
      .sort((a, b) => Number(a) - Number(b));
    if (numericKeys.length) return numericKeys.map((key) => raw[key]);
  }
  return [];
};

export default function JobDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const pricingTo = `/pricing?from=${encodeURIComponent(location.pathname || '/')}`;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [otherJobs, setOtherJobs] = useState([]);
  const [publicCapacity, setPublicCapacity] = useState(null);
  const [publicCapacityLoading, setPublicCapacityLoading] = useState(false);
  const [spotlightActivity, setSpotlightActivity] = useState({ notices: [], shortlisted: [] });

  useEffect(() => {
    const fetchJob = async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!error && data) {
        setJob(data);
      }
      setLoading(false);
    };
    fetchJob();
  }, [id]);

  useEffect(() => {
    if (!job) return;
    const expired = isJobExpired(job.application_deadline);
    const externalApply = job.apply_link && String(job.apply_link).trim();
    const notOpen = job.status !== 'open';
    if (expired || externalApply || notOpen) {
      setPublicCapacity(null);
      setPublicCapacityLoading(false);
      return;
    }
    let cancelled = false;
    setPublicCapacityLoading(true);
    setPublicCapacity(null);
    (async () => {
      const { data, error } = await supabase.rpc('get_public_job_lead_capacity', {
        p_job_id: job.id,
      });
      if (cancelled) return;
      setPublicCapacityLoading(false);
      if (error || !data?.ok) {
        setPublicCapacity({
          accepts_applications: true,
          application_limit: null,
          filled: null,
          remaining: null,
        });
        return;
      }
      setPublicCapacity(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [job]);

  useEffect(() => {
    if (!id) return;
    const fetchOtherJobs = async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, company_name, location, audience_tracks, allowed_plans, application_deadline, walk_in_date, apply_link')
        .eq('show_on_landing', true)
        .eq('status', 'open')
        .neq('id', id);
      if (!error && data) {
        setOtherJobs(data
          .filter((j) => !isJobExpired(j.application_deadline))
          .map((j) => {
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
              isFree: !(j.allowed_plans && j.allowed_plans.length),
              applicationDeadline: formatDate(j.application_deadline),
              walkInDate: formatDate(j.walk_in_date),
            };
          }));
      }
    };
    fetchOtherJobs();
  }, [id]);

  useEffect(() => {
    if (!job?.id) {
      setSpotlightActivity({ notices: [], shortlisted: [] });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc('get_landing_hiring_spotlight');
      if (cancelled) return;
      const spotlightJobs = parseSpotlightPayload(data);
      const matched = spotlightJobs.find((entry) => String(entry?.id) === String(job.id));
      if (!matched) {
        setSpotlightActivity({ notices: [], shortlisted: [] });
        return;
      }
      setSpotlightActivity({
        notices: toArray(matched.notices),
        shortlisted: toArray(matched.shortlisted),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [job?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <PageLoader size="lg" label="Loading job details..." />
        </div>
        <Footer />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Job Not Found</h2>
          <p className="text-slate-600 mb-8">The job you are looking for does not exist or has been removed.</p>
          <Link to="/" className="nth-btn-primary px-6 py-3 rounded-xl font-bold">
            Back to Home
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const isExpired = isJobExpired(job.application_deadline);
  const jobNotAccepting = job.status !== 'open';
  const usesPublicForm = !(
    (job.apply_link && job.apply_link.trim()) ||
    isExpired ||
    jobNotAccepting
  );
  const publicApplyFull =
    usesPublicForm && publicCapacity && publicCapacity.accepts_applications === false;
  const publicSpotsHint =
    usesPublicForm &&
    publicCapacity &&
    publicCapacity.application_limit != null &&
    publicCapacity.accepts_applications
      ? `${publicCapacity.remaining ?? 0} public spot${(publicCapacity.remaining ?? 0) === 1 ? '' : 's'} left`
      : null;
  const seoDescription =
    trimText(job.description, 155) ||
    `Apply for ${job.title} at ${job.company_name} with Naveen Talent Hub.`;
  const jobNotices = spotlightActivity.notices.length > 0 ? spotlightActivity.notices : toArray(job.notices);
  const jobShortlisted = spotlightActivity.shortlisted.length > 0 ? spotlightActivity.shortlisted : toArray(job.shortlisted);
  const hasActivity = jobNotices.length > 0 || jobShortlisted.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <Seo 
        title={`${job.title} at ${job.company_name} | Naveen Talent Hub`}
        description={seoDescription}
        canonicalPath={`/jobs/${id}`}
        ogImage="/hero-section/hero-image.jpg"
      />
      <Navbar />

      <main className="pt-20 sm:pt-24 lg:pt-28 pb-12 md:pb-16 min-w-0">
        <SectionContainer className="min-w-0 max-w-full">

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 sm:gap-6 lg:gap-8 min-w-0">
            {/* Left Column: Job Info */}
            <div className="xl:col-span-2 space-y-6 sm:space-y-8 min-w-0">
              <div className="bg-white rounded-3xl p-5 sm:p-6 md:p-10 shadow-sm border border-slate-100 min-w-0 overflow-hidden">
                <div className="flex flex-col 2xl:flex-row 2xl:items-start justify-between gap-4 sm:gap-6 mb-6 sm:mb-8 min-w-0">
                  <div className="flex items-start gap-3 sm:gap-5 min-w-0 flex-1">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0 text-indigo-600">
                      <HiBuildingOffice2 className="w-6 h-6 sm:w-8 sm:h-8 shrink-0" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h1 className="text-xl min-[400px]:text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 mb-2 leading-snug sm:leading-tight wrap-break-word">
                        {job.title}
                      </h1>
                      <div className="flex flex-wrap items-center gap-y-2 gap-x-3 sm:gap-x-4 text-slate-600 font-medium min-w-0">
                        <p className="text-base sm:text-lg text-indigo-600 wrap-anywhere min-w-0 max-w-full">
                          {job.company_name}
                        </p>
                        <span className="w-1 h-1 rounded-full bg-slate-300 hidden md:block shrink-0" />
                        {job.location && job.location !== '—' && (
                          <div className="flex items-start gap-1.5 min-w-0 max-w-full">
                            <HiMapPin className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="wrap-anywhere">{job.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex w-full 2xl:w-auto flex-wrap gap-2 2xl:justify-end min-w-0">
                    <span className="inline-flex items-center max-w-full 2xl:max-w-56 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold wrap-break-word">
                      {job.job_type || 'Full-time'}
                    </span>
                    {job.salary_range && (
                      <span className="inline-flex items-center max-w-full 2xl:max-w-56 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs sm:text-sm font-bold wrap-break-word">
                        {job.salary_range}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 py-6 border-y border-slate-100 min-w-0">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Experience</span>
                    <div className="flex items-start gap-2 text-slate-800 font-bold min-w-0">
                      <HiBriefcase className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                      <span className="wrap-anywhere">{job.experience_level || '0-3 Years'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deadline</span>
                    <div className="flex items-start gap-2 text-slate-800 font-bold min-w-0">
                      <HiCalendarDays className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                      <span className="wrap-anywhere">
                        {job.application_deadline ? new Date(job.application_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Flexible'}
                      </span>
                    </div>
                  </div>
                  {job.location && job.location !== '—' && (
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Location</span>
                      <div className="flex items-start gap-2 text-slate-800 font-bold min-w-0">
                        <HiMapPin className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                        <span className="wrap-anywhere">{job.location}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-8 min-w-0">
                  <section className="min-w-0">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Job Description</h2>
                    <div className="prose prose-slate max-w-full text-slate-600 leading-relaxed whitespace-pre-wrap wrap-anywhere">
                      {job.description || 'No description provided.'}
                    </div>
                  </section>

                  <section className="min-w-0">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Live Hiring Activity</h2>
                    {hasActivity ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                          <h3 className="text-sm font-semibold text-slate-800 mb-3">Timeline Updates</h3>
                          {jobNotices.length > 0 ? (
                            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                              {jobNotices.map((notice, idx) => (
                                <div key={`notice-${idx}`} className="rounded-xl bg-white border border-slate-100 p-3">
                                  <p className="text-sm text-slate-700 wrap-anywhere">{notice?.message ?? 'Update available'}</p>
                                  {notice?.at && (
                                    <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">{notice.at}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">No timeline updates yet.</p>
                          )}
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                          <h3 className="text-sm font-semibold text-slate-800 mb-3">Selected Aspirants</h3>
                          {jobShortlisted.length > 0 ? (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                              {jobShortlisted.map((person, idx) => (
                                <div key={`shortlisted-${idx}`} className="flex items-center justify-between gap-2 rounded-xl bg-white border border-slate-100 px-3 py-2">
                                  <span className="text-sm font-medium text-slate-700 wrap-anywhere">
                                    {person?.name || 'Candidate'}
                                  </span>
                                  <span className="text-xs text-slate-500 shrink-0">{person?.city || 'N/A'}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">No shortlisted aspirants yet.</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                        <p className="text-sm text-slate-500">
                          Activity will appear here once admins publish timeline updates or shortlisted candidates.
                        </p>
                      </div>
                    )}
                  </section>

                  {job.requirements && job.requirements.length > 0 && (
                    <section className="min-w-0">
                      <h2 className="text-xl font-bold text-slate-900 mb-4">Key Responsibilities / Requirements</h2>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
                        {job.requirements.map((req, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-slate-600 min-w-0">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                            <span className="wrap-anywhere min-w-0">{req}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Apply Sidebar */}
            <div className="xl:col-span-1 min-w-0">
              <div className="xl:sticky xl:top-24 space-y-5 sm:space-y-6 min-w-0">
                <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative min-w-0">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16" />
                  
                  <h3 className="text-lg font-bold text-slate-900 mb-4 relative z-10">Interested in this role?</h3>
                  <p className="text-slate-600 text-sm mb-6 relative z-10">
                    Submit your application today. Our team will review your profile and get back to you if there's a match.
                  </p>

                  {isExpired ? (
                    <div className="w-full text-center px-6 py-4 rounded-2xl bg-slate-100 text-slate-500 font-bold border border-slate-200 cursor-not-allowed">
                      Applications Closed
                    </div>
                  ) : jobNotAccepting ? (
                    <div className="w-full text-center px-6 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold border border-slate-200 cursor-not-allowed">
                      Not accepting applications
                    </div>
                  ) : (job.apply_link && job.apply_link.trim()) ? (
                    <a
                      href={job.apply_link.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full nth-btn-primary px-6 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all flex items-center justify-center gap-3 group no-underline"
                    >
                      Apply Now
                    </a>
                  ) : publicCapacityLoading ? (
                    <div className="w-full text-center px-6 py-4 rounded-2xl bg-slate-50 text-slate-500 font-bold border border-slate-200 animate-pulse">
                      Loading…
                    </div>
                  ) : publicApplyFull ? (
                    <div className="w-full text-center px-6 py-4 rounded-2xl bg-amber-50 text-amber-900 font-bold border border-amber-100 cursor-not-allowed">
                      Applications full
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowApplyModal(true)}
                      className="w-full nth-btn-primary px-6 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all flex items-center justify-center gap-3 group"
                    >
                      Apply Now
                    </button>
                  )}

                  {publicSpotsHint && (
                    <p className="mt-3 text-xs font-medium text-slate-500 text-center relative z-10">
                      {publicSpotsHint}
                    </p>
                  )}

                  <div className="mt-6 pt-6 border-t border-slate-50 flex flex-col gap-4 text-xs font-medium text-slate-500">
                    <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-indigo-500" />
                       Free application for everyone
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-indigo-500" />
                       Direct connection with recruiters
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-5 sm:p-6 text-white shadow-xl shadow-indigo-200/50 min-w-0 overflow-hidden">
                   <h3 className="text-lg font-bold mb-2">Want to boost your chances?</h3>
                   <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
                     Get direct interview slots and expert mock interview practice with our Premium plans.
                   </p>
                   <Link 
                     to={pricingTo}
                     className="block w-full text-center px-6 py-3 rounded-xl bg-white text-indigo-600 font-bold hover:bg-slate-50 transition-colors duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                   >
                     View Pricing
                   </Link>
                </div>
              </div>
            </div>
          </div>

          {/* More Jobs - Free & Premium */}
          {otherJobs.length > 0 && (
            <section className="mt-12 sm:mt-16 pt-10 sm:pt-12 border-t border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-2">More opportunities</h2>
              <p className="text-slate-600 text-sm mb-6">Explore other open positions</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
                {otherJobs.map((j) => (
                  <Link
                    key={j.id}
                    to={`/jobs/${j.id}`}
                    className="block min-w-0 max-w-full bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-shadow duration-200 group overflow-hidden cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex flex-wrap gap-2">
                        {j.isFree ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                            <HiSparkles className="w-3 h-3" />
                            Free
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold">
                            <HiBriefcase className="w-3 h-3" />
                            Premium
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-slate-500">{j.experience}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
                      {j.title}
                    </h3>
                    <p className="text-sm font-medium text-indigo-600 mb-1">{j.company}</p>
                    {j.city && j.city !== '—' && (
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <HiMapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {j.city}
                      </p>
                    )}
                    {j.applicationDeadline && (
                      <p className="text-xs text-slate-500 mt-1">Apply by {j.applicationDeadline}</p>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 mt-3">
                      View details
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </SectionContainer>
      </main>

      <Footer />

      {/* Application Modal */}
      {showApplyModal && !publicApplyFull && !isExpired && !jobNotAccepting && (
        <FreeJobApplicationForm
          jobId={job.id}
          jobTitle={job.title}
          jobCompany={job.company_name}
          onClose={() => setShowApplyModal(false)}
        />
      )}
    </div>
  );
}
