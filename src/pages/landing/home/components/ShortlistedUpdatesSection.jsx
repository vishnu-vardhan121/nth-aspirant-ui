import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HiChatBubbleLeftRight, HiCheckCircle, HiClock, HiMapPin, HiArrowRight, HiOutlineSparkles } from 'react-icons/hi2';
import { motion } from 'framer-motion';
import SectionContainer from '../../../../components/SectionContainer';
import { supabase } from '../../../../lib/supabase';
import { Loader } from '../../../../components/ui/Loader';

/** In-card preview cap; keeps DOM light for very large shortlists (rest via job link). */
const SHORTLIST_PREVIEW_MAX = 48;

/** Column height uses viewport so long feeds scroll inside the card instead of stretching the page. */
const FEED_COLUMN_CLASS =
  'flex min-h-0 max-h-[min(22rem,55svh)] flex-col p-4 sm:max-h-[min(24rem,50svh)]';
const FEED_SCROLL_BODY_CLASS =
  'min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]';

function NoticeItem({ item, isLast }) {
  return (
    <div className="relative flex gap-3 items-start group">
      {!isLast && (
        <div className="absolute top-5 left-[9px] bottom-[-16px] w-px border-l-2 border-dashed border-indigo-100 group-hover:border-indigo-300 transition-colors duration-300 z-0" />
      )}

      {/* Node */}
      <div className="relative z-10 mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_0_0_3px_white] ring-1 ring-indigo-100 group-hover:ring-indigo-300 transition-all duration-200">
        <div className="h-2 w-2 rounded-full bg-indigo-500" />
      </div>

      {/* Content */}
      <div className="flex-1 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 transition-all duration-200 hover:border-indigo-100 hover:bg-white">
        <p className="text-xs text-slate-600 leading-relaxed">
          <span className="font-bold text-indigo-600 mr-1.5">Admin:</span>
          {item.message}
        </p>
        <span className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase text-slate-400">
          <HiClock className="h-3 w-3 text-indigo-300" /> {item.at}
        </span>
      </div>
    </div>
  );
}

function coerceJsonArray(value) {
  if (value == null) return [];
  if (typeof value === 'string') {
    try { return coerceJsonArray(JSON.parse(value)); } catch { return []; }
  }
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') {
    const keys = Object.keys(value).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
    if (keys.length > 0) return keys.map((k) => value[k]);
  }
  return [];
}

function parseSpotlightPayload(raw) {
  if (raw == null) return [];
  if (typeof raw === 'string') {
    try { return parseSpotlightPayload(JSON.parse(raw)); } catch { return []; }
  }
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object' && raw !== null) {
    if (typeof raw.jobs === 'string') {
      try { return parseSpotlightPayload({ ...raw, jobs: JSON.parse(raw.jobs) }); } catch { return []; }
    }
    if (Array.isArray(raw.jobs)) return raw.jobs;
    const keys = Object.keys(raw).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
    if (keys.length > 0) return keys.map((k) => raw[k]);
  }
  return [];
}

async function fetchSpotlightJobsFallback() {
  const { data, error } = await supabase
    .from('jobs')
    .select('id, title, company_name, location, hiring_spotlight_order')
    .eq('status', 'open')
    .eq('hiring_spotlight', true)
    .order('hiring_spotlight_order', { ascending: true })
    .limit(12);
  if (error || !Array.isArray(data) || data.length === 0) return [];
  return data.map((row) => ({ ...row, notices: [], shortlisted: [] }));
}

function normalizeJob(j) {
  if (!j || typeof j !== 'object') return null;
  return {
    id: j.id,
    title: j.title ?? '',
    company_name: j.company_name ?? '',
    location: j.location ?? '',
    notices: coerceJsonArray(j.notices),
    shortlisted: coerceJsonArray(j.shortlisted),
  };
}

export default function ShortlistedUpdatesSection() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [feedPartial, setFeedPartial] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFetchError(null);
      setFeedPartial(false);
      const { data, error: rpcError } = await supabase.rpc('get_landing_hiring_spotlight');
      if (cancelled) return;

      let list = [];
      if (!rpcError && data != null) {
        list = parseSpotlightPayload(data).map(normalizeJob).filter(Boolean);
      }

      let fromFallback = false;
      if (list.length === 0) {
        const fb = await fetchSpotlightJobsFallback();
        if (cancelled) return;
        if (fb.length > 0) {
          list = fb.map(normalizeJob).filter(Boolean);
          fromFallback = true;
        }
      }

      setLoading(false);
      if (cancelled) return;
      if (list.length === 0 && rpcError) {
        setFetchError(rpcError.message || 'Could not load hiring spotlight.');
      } else {
        setFetchError(null);
      }
      setFeedPartial(fromFallback);
      setJobs(list);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <SectionContainer>
          <div className="flex flex-col min-h-[200px] items-center justify-center gap-3 text-slate-400">
            <Loader size="md" />
            <span className="text-xs font-semibold tracking-wide uppercase">Loading...</span>
          </div>
        </SectionContainer>
      </section>
    );
  }

  const header = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mb-8"
    >
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">
          Shortlist Updates
        </span>
      </div>
      <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
        Live Hiring <span className="text-indigo-600">Activity</span>
      </h2>
      <p className="mt-2 text-sm text-slate-500 font-medium max-w-lg">
        Interview updates and shortlisted candidates for roles we're highlighting right now.
      </p>
    </motion.div>
  );

  if (fetchError) {
    return (
      <section className="py-16 bg-white">
        <SectionContainer>
          {header}
          <div className="max-w-xl rounded-2xl border border-red-100 bg-red-50 p-6">
            <h3 className="text-sm font-bold text-red-900">Couldn't load this section</h3>
            <p className="mt-1 text-xs text-red-700">{fetchError}</p>
          </div>
        </SectionContainer>
      </section>
    );
  }

  if (jobs.length === 0) {
    return (
      <section className="py-16 bg-white">
        <SectionContainer>
          {header}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 mb-4">
              <HiOutlineSparkles className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No spotlight roles yet</h3>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              When an admin turns on <strong>Hiring spotlight</strong> for an open job, those updates and selected candidates will appear here automatically.
            </p>
            <Link to="/" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors">
              Browse open jobs <HiArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>
        </SectionContainer>
      </section>
    );
  }

  const jobsWithFeed = jobs.filter(
    (j) => j.notices.length > 0 || j.shortlisted.length > 0
  );

  if (jobsWithFeed.length === 0) {
    return (
      <section className="py-16 bg-white">
        <SectionContainer>
          {header}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 mb-4">
              <HiOutlineSparkles className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No activity to show yet</h3>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              Spotlight roles are on, but there are no timeline updates or shortlisted candidates yet. Check back soon.
            </p>
            <Link to="/" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors">
              Browse open jobs <HiArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>
        </SectionContainer>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white">
      <SectionContainer>
        {header}

        {feedPartial && (
          <div className="mb-6 max-w-xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <h4 className="text-xs font-bold text-amber-900 flex items-center gap-2">
              <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Limited Feed Active
            </h4>
            <p className="mt-0.5 text-xs text-amber-800 leading-relaxed">
              Notices and shortlists need spotlight RPC. Run migration <strong>062</strong> to enable full data.
            </p>
          </div>
        )}

        <div className={`grid gap-5 ${jobsWithFeed.length === 1 ? 'grid-cols-1' : 'lg:grid-cols-2'}`}>
          {jobsWithFeed.map((job, idx) => {
            const hasNotices = job.notices.length > 0;
            const hasShortlisted = job.shortlisted.length > 0;
            const bodyGridClass =
              hasNotices && hasShortlisted
                ? 'grid min-h-0 grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0'
                : 'grid min-h-0 grid-cols-1';

            return (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ delay: idx * 0.08, duration: 0.4, ease: 'easeOut' }}
              className="group relative rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300 overflow-x-clip"
            >
              {/* Top accent bar on hover */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight truncate">
                    {job.title}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-100">
                      {job.company_name}
                    </span>
                    {job.location && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                        <HiMapPin className="h-3 w-3" />
                        {job.location}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  {hasShortlisted && (
                    <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1">
                      <HiCheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
                        {job.shortlisted.length} Set
                      </span>
                    </div>
                  )}
                  <Link
                    to={`/jobs/${job.id}`}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
                  >
                    Open role page
                  </Link>
                </div>
              </div>

              <div className={bodyGridClass}>

                {hasNotices && (
                <div className={FEED_COLUMN_CLASS}>
                  <div className="flex shrink-0 items-center gap-2 mb-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
                      <HiChatBubbleLeftRight className="h-3.5 w-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800">Timeline Updates</h4>
                  </div>

                    <div className={`${FEED_SCROLL_BODY_CLASS} pr-1`}>
                      <div className="flex flex-col gap-3 pb-1">
                        {job.notices.map((notice, i) => (
                          <NoticeItem
                            key={`${job.id}-n-${String(notice.id ?? '')}-${i}`}
                            item={notice}
                            isLast={i === job.notices.length - 1}
                          />
                        ))}
                      </div>
                    </div>
                </div>
                )}

                {hasShortlisted && (
                <div className={FEED_COLUMN_CLASS}>
                  <div className="flex shrink-0 items-center gap-2 mb-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500">
                      <HiCheckCircle className="h-3.5 w-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800">Selected Aspirants</h4>
                  </div>

                    <div className="flex min-h-0 flex-1 flex-col">
                      <div className={`${FEED_SCROLL_BODY_CLASS} pr-2`}>
                        {job.shortlisted.slice(0, SHORTLIST_PREVIEW_MAX).map((person, i) => (
                          <div
                            key={`${job.id}-sl-${String(person.id)}-${i}`}
                            className="group/row flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 font-bold text-[10px] group-hover/row:bg-indigo-50 group-hover/row:text-indigo-600 transition-colors">
                                {person.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs font-semibold text-slate-700 truncate">
                                {person.name}
                              </span>
                            </div>
                            <span className="flex shrink-0 items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 border border-slate-100">
                              <HiMapPin className="h-2.5 w-2.5" />
                              {person.city || 'N/A'}
                            </span>
                          </div>
                        ))}
                      </div>

                      {job.shortlisted.length > SHORTLIST_PREVIEW_MAX && (
                        <div className="mt-2 pt-2 border-t border-slate-100 text-center">
                          <Link
                            to={`/jobs/${job.id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-500 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full transition-colors"
                          >
                            +{job.shortlisted.length - SHORTLIST_PREVIEW_MAX} More <HiArrowRight className="h-2.5 w-2.5" />
                          </Link>
                        </div>
                      )}
                    </div>
                </div>
                )}

              </div>
            </motion.div>
            );
          })}
        </div>

        {/* CTA Footer */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 rounded-2xl bg-slate-900 overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-8 py-6">
            <div className="text-center sm:text-left">
              <h3 className="text-lg font-extrabold text-white tracking-tight">
                Stay entirely ahead in hiring
              </h3>
              <p className="text-sm text-slate-400 font-medium mt-0.5 max-w-sm">
                Keep your profile updated and apply early for the roles that matter.
              </p>
            </div>
            <Link
              to="/pricing?from=/"
              className="group shrink-0 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-900 hover:bg-indigo-50 transition-colors"
            >
              Get Started Now
              <HiArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-indigo-600 transition-colors" />
            </Link>
          </div>
        </motion.div>

      </SectionContainer>
    </section>
  );
}