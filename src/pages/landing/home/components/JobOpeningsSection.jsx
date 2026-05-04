/**
 * JobOpeningsSection — redesigned with polished UI
 * Shared by landing (`variant="landing"`) and `/jobs` (`variant="directory"`).
 */

import { Link, useLocation } from 'react-router-dom';
import {
  HiMapPin,
  HiSparkles,
  HiLockClosed,
  HiBriefcase,
  HiArrowRight,
  HiChatBubbleLeftRight,
  HiCheckBadge,
  HiClock,
  HiUserGroup,
} from 'react-icons/hi2';
import SectionContainer from '../../../../components/SectionContainer';
import { PageLoader } from '../../../../components/ui/Loader';
import { useState, useEffect, useMemo } from 'react';
import { useAppSelector } from '../../../../store/hooks';
import { supabase } from '../../../../lib/supabase';

/* ─────────────────────────────────────── helpers ─── */
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

function normalizeSpotlightJob(job) {
  if (!job || typeof job !== 'object' || !job.id) return null;
  return {
    id: job.id,
    title: job.title ?? 'Hiring role',
    company: job.company_name ?? '',
    city: job.location ?? '—',
    notices: coerceJsonArray(job.notices),
    shortlisted: coerceJsonArray(job.shortlisted),
  };
}

/** Compact time for notice rows: uses `at`, `created_at`, or `createdAt` when parseable as a date; otherwise returns short raw string. */
function formatNoticeTimeLabel(item) {
  if (!item || typeof item !== 'object') return null;
  const raw = item.at ?? item.created_at ?? item.createdAt ?? item.timestamp ?? null;
  if (raw == null) return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
  }
  const s = String(raw).trim();
  if (!s) return null;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  return s.length > 40 ? `${s.slice(0, 37)}…` : s;
}

/* ─────────────────────────────────────── Avatar chip ─── */
function AvatarChip({ name }) {
  const initials = name
    ? name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
    : '?';
  const colors = [
    'bg-violet-100 text-violet-800 border-violet-200',
    'bg-indigo-100 text-indigo-800 border-indigo-200',
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-emerald-100 text-emerald-800 border-emerald-200',
    'bg-amber-100 text-amber-800 border-amber-200',
    'bg-rose-100 text-rose-800 border-rose-200',
  ];
  const color = colors[(name?.charCodeAt(0) ?? 0) % colors.length];
  return (
    <span
      className={`inline-flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full border text-xs font-semibold ${color} whitespace-nowrap`}
    >
      <span
        className={`inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/80 text-[10px] font-bold ${color.split(' ')[1]}`}
      >
        {initials}
      </span>
      {name ?? 'Candidate'}
    </span>
  );
}

/* ─────────────────────────────────────── Badge ─── */
function Badge({ free }) {
  return free ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold tracking-wide border border-indigo-200/70 uppercase">
      <HiSparkles className="w-3 h-3 shrink-0" />
      Free
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 text-[11px] font-bold tracking-wide border border-violet-200/70 uppercase">
      <HiBriefcase className="w-3 h-3 shrink-0" />
      Premium
    </span>
  );
}

/* ─────────────────────────────────────── CTA button ─── */
function CtaButton({ job, isAuthenticated, pricingTo }) {
  const canView = job.isFree || isAuthenticated;

  if (job.isExpired) {
    return (
      <div className="w-full text-center px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 bg-slate-50 border border-slate-200/80 cursor-not-allowed select-none">
        {job.isUpdatesOnly ? 'Role no longer open' : 'Application closed'}
      </div>
    );
  }
  if (canView) {
    if (job.isUpdatesOnly) {
      return (
        <Link
          to={`/jobs/${job.id}`}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          View Role <HiArrowRight className="w-4 h-4 shrink-0" />
        </Link>
      );
    }
    if (job.isFree) {
      return (
        <Link
          to={`/jobs/${job.id}`}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Apply Now <HiArrowRight className="w-4 h-4 shrink-0" />
        </Link>
      );
    }
    return (
      <Link
        to={pricingTo}
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl font-semibold text-sm bg-violet-600 hover:bg-violet-700 text-white transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
      >
        View Plans to Apply <HiArrowRight className="w-4 h-4 shrink-0" />
      </Link>
    );
  }
  return (
    <Link
      to={pricingTo}
      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl font-semibold text-sm border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 bg-white transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      <HiLockClosed className="w-4 h-4 shrink-0" />
      Unlock Position
    </Link>
  );
}

/* ─────────────────────────────────────── Message bubble ─── */
function MessageBubble({ text, index, timeLabel }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-[10px] font-bold text-indigo-700">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-700 leading-snug">{text}</p>
        {timeLabel ? (
          <span className="mt-1 block text-[10px] text-slate-400 font-medium tabular-nums tracking-wide">
            {timeLabel}
          </span>
        ) : null}
      </div>
    </li>
  );
}

/* ─────────────────────────────────────── Landing row card ─── */
function JobRowLanding({ job, hoveredId, setHoveredId, isAuthenticated, pricingTo }) {
  const notices = job.activity?.notices ?? [];
  const recentNotices = notices.slice(Math.max(0, notices.length - 5));
  const shortlisted = job.activity?.shortlisted ?? [];
  const hasMessages = recentNotices.length > 0;
  const hasCandidates = shortlisted.length > 0;
  const isHovered = hoveredId === job.id;
  const canView = job.isFree || isAuthenticated;

  return (
    <article
      onMouseEnter={() => setHoveredId(job.id)}
      onMouseLeave={() => setHoveredId(null)}
      className={`relative w-full rounded-2xl overflow-hidden border transition-all duration-200 bg-white
        ${job.isFree ? 'border-indigo-100 hover:border-indigo-200' : 'border-violet-100 hover:border-violet-200'}
        ${isHovered ? 'shadow-xl shadow-indigo-100/40 ring-1 ring-indigo-100' : 'shadow-md shadow-slate-100/60'}
      `}
    >
      {/* top accent line */}
      <div className={`h-1 w-full ${job.isFree ? 'bg-gradient-to-r from-indigo-500 to-indigo-400' : 'bg-gradient-to-r from-violet-500 to-violet-400'}`} />

      {/* 2-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">

        {/* LEFT: job info */}
        <div className="lg:col-span-5 p-5 sm:p-6 flex flex-col gap-4">
          {/* row: badge + experience */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge free={job.isFree} />
              {job.isUpdatesOnly && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold uppercase">
                  Spotlight
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
              {job.experience}
            </span>
          </div>

          {/* title */}
          <div>
            <h3 className="text-xl font-bold text-slate-900 leading-snug line-clamp-2 mb-1">
              {job.title}
            </h3>
            {canView ? (
              <p className="text-sm font-semibold text-indigo-600">{job.company || 'NTH Hiring Partner'}</p>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 font-medium">
                <HiLockClosed className="w-3.5 h-3.5 shrink-0" />
                Premium Members Only
              </div>
            )}
          </div>

          {/* meta */}
          <div className="flex flex-col gap-1.5 text-sm text-slate-600">
            {job.city && job.city !== '—' && (
              <span className="flex items-center gap-1.5">
                <HiMapPin className="w-4 h-4 text-slate-400 shrink-0" />
                {job.city}
              </span>
            )}
            {job.applicationDeadline && (
              <span className="flex items-center gap-1.5">
                <HiClock className="w-4 h-4 text-slate-400 shrink-0" />
                Apply by {job.applicationDeadline}
              </span>
            )}
          </div>

          {/* requirements */}
          {job.requirements?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {job.requirements.slice(0, 4).map((req) => (
                <span key={req} className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200">
                  {req}
                </span>
              ))}
              {job.requirements.length > 4 && (
                <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-500 text-xs font-medium">
                  +{job.requirements.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* CTA */}
          <div className="mt-auto pt-2">
            <CtaButton job={job} isAuthenticated={isAuthenticated} pricingTo={pricingTo} />
          </div>
        </div>

        {/* RIGHT: updates */}
        <div className="lg:col-span-7 p-5 sm:p-6 flex flex-col gap-4 bg-slate-50/50">
          {/* header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Live Updates</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-400">
              {hasMessages && (
                <span className="flex items-center gap-1">
                  <HiChatBubbleLeftRight className="w-3.5 h-3.5" />
                  {recentNotices.length} msg{recentNotices.length !== 1 ? 's' : ''}
                </span>
              )}
              {hasCandidates && (
                <span className="flex items-center gap-1">
                  <HiUserGroup className="w-3.5 h-3.5" />
                  {shortlisted.length} shortlisted
                </span>
              )}
            </div>
          </div>

          {/* messages */}
          {hasMessages ? (
            <ul className="space-y-3">
              {recentNotices.map((item, i) => (
                <MessageBubble
                  key={`${job.id}-m-${i}`}
                  text={item?.message ?? ''}
                  index={i}
                  timeLabel={formatNoticeTimeLabel(item)}
                />
              ))}
            </ul>
          ) : (
            <div className="flex-1 min-h-[64px] flex flex-col items-center justify-center rounded-xl border border-dashed border-indigo-200 bg-white/70 py-5 sm:py-6 gap-1.5">
              <HiChatBubbleLeftRight className="w-8 h-8 text-indigo-200" />
              <p className="text-xs text-slate-400 font-medium">No messages yet</p>
            </div>
          )}

          {/* shortlisted */}
          {hasCandidates && (
            <div className="rounded-xl border border-indigo-100 bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <HiCheckBadge className="w-4 h-4 text-indigo-500 shrink-0" />
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-700">Shortlisted</p>
                <span className="ml-auto text-[11px] text-slate-400 font-semibold">{shortlisted.length} candidate{shortlisted.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {shortlisted.slice(0, 24).map((person, i) => (
                  <AvatarChip key={`${job.id}-s-${i}`} name={person?.name} />
                ))}
                {shortlisted.length > 24 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-100 border border-indigo-200 text-xs font-bold text-indigo-800">
                    +{shortlisted.length - 24} more
                  </span>
                )}
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-400 leading-relaxed mt-auto">
            Open the role for the full hiring timeline →
          </p>
        </div>
      </div>
    </article>
  );
}

/* ─────────────────────────────────────── Directory card ─── */
function JobCardDirectory({ job, hoveredId, setHoveredId, isAuthenticated, pricingTo }) {
  const notices = job.activity?.notices ?? [];
  const shortlisted = job.activity?.shortlisted ?? [];
  const hasActivity = notices.length > 0 || shortlisted.length > 0;
  const isHovered = hoveredId === job.id;
  const canView = job.isFree || isAuthenticated;

  return (
    <article
      onMouseEnter={() => setHoveredId(job.id)}
      onMouseLeave={() => setHoveredId(null)}
      className={`relative self-start flex flex-col rounded-2xl overflow-hidden border bg-white transition-all duration-200
        ${job.isFree ? 'border-indigo-100 hover:border-indigo-200' : 'border-violet-100 hover:border-violet-200'}
        ${isHovered ? 'shadow-xl shadow-indigo-100/40 ring-1 ring-indigo-100' : 'shadow-sm'}
      `}
    >
      <div className={`h-1 w-full ${job.isFree ? 'bg-gradient-to-r from-indigo-500 to-indigo-400' : 'bg-gradient-to-r from-violet-500 to-violet-400'}`} />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* header */}
        <div className="flex items-start justify-between gap-2">
          <Badge free={job.isFree} />
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg whitespace-nowrap">
            {job.experience}
          </span>
        </div>

        {/* title + company */}
        <div>
          <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2 mb-1">
            {job.title}
          </h3>
          {job.isUpdatesOnly && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase mb-1">
              Spotlight
            </span>
          )}
          {canView ? (
            <p className="text-xs font-semibold text-indigo-600">{job.company || 'NTH Hiring Partner'}</p>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 font-medium">
              <HiLockClosed className="w-3 h-3 shrink-0" />
              Premium only
            </div>
          )}
        </div>

        {/* meta */}
        <div className="flex flex-col gap-1 text-xs text-slate-600">
          {job.city && job.city !== '—' && (
            <span className="flex items-center gap-1.5">
              <HiMapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {job.city}
            </span>
          )}
          {job.applicationDeadline && (
            <span className="flex items-center gap-1.5">
              <HiClock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Apply by {job.applicationDeadline}
            </span>
          )}
        </div>

        {/* activity */}
        {hasActivity && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Hiring Activity</p>
              </div>
              <span className="text-[10px] text-slate-400">{notices.length + shortlisted.length} updates</span>
            </div>

            {notices.length > 0 && (
              <ul className="space-y-1.5">
                {notices.slice(0, 3).map((item, i) => {
                  const timeLbl = formatNoticeTimeLabel(item);
                  return (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-slate-700 leading-snug">
                      <span className="mt-0.5 w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="block">{item?.message ?? ''}</span>
                        {timeLbl ? (
                          <span className="mt-0.5 block text-[9px] text-slate-400 font-medium tabular-nums">{timeLbl}</span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {shortlisted.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Shortlisted</p>
                <div className="flex flex-wrap gap-1">
                  {shortlisted.slice(0, 6).map((person, i) => (
                    <AvatarChip key={i} name={person?.name} />
                  ))}
                  {shortlisted.length > 6 && (
                    <span className="px-2 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-[10px] font-bold text-indigo-700">
                      +{shortlisted.length - 6}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* requirements */}
        {job.requirements?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {job.requirements.slice(0, 3).map((req) => (
              <span key={req} className="px-2 py-0.5 rounded-lg bg-slate-50 text-slate-700 text-[11px] font-medium border border-slate-200">
                {req}
              </span>
            ))}
            {job.requirements.length > 3 && (
              <span className="px-2 py-0.5 rounded-lg bg-slate-50 text-slate-500 text-[11px]">+{job.requirements.length - 3}</span>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto pt-2 border-t border-slate-100">
          <CtaButton job={job} isAuthenticated={isAuthenticated} pricingTo={pricingTo} />
        </div>
      </div>
    </article>
  );
}

/* ─────────────────────────────────────── Main section ─── */
export default function JobOpeningsSection({
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
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const deadline = new Date(deadlineStr); deadline.setHours(0, 0, 0, 0);
      return today > deadline;
    };
    const mapLandingJobs = (data) => data.map((j) => {
      const tracks = Array.isArray(j.audience_tracks) ? j.audience_tracks : [];
      const hasFresher = tracks.includes('fresher');
      const hasExperienced = tracks.includes('experienced');
      const experienceLabel = hasFresher && hasExperienced
        ? 'Fresher & Experienced'
        : hasFresher ? 'Fresher' : hasExperienced ? 'Experienced' : 'Fresher';
      return {
        id: j.id, title: j.title, company: j.company_name ?? '', city: j.location ?? '—',
        experience: experienceLabel, requirements: [],
        isFree: !(j.allowed_plans && j.allowed_plans.length),
        applyLink: j.apply_link || '/dashboard/jobs',
        applicationDeadline: formatDate(j.application_deadline),
        walkInDate: formatDate(j.walk_in_date),
        address: j.address ?? '',
        isExpired: isExpired(j.application_deadline),
        activity: null, isUpdatesOnly: false,
      };
    });

    const fetchJobs = async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, company_name, location, audience_tracks, allowed_plans, application_deadline, walk_in_date, address, apply_link')
        .eq('show_on_landing', true)
        .order('created_at', { ascending: false });

      if (error || !data) { setLandingJobs([]); setLoading(false); return; }

      const baseJobs = mapLandingJobs(data);
      const { data: spotlightData } = await supabase.rpc('get_landing_hiring_spotlight');
      const spotlightJobs = parseSpotlightPayload(spotlightData).map(normalizeSpotlightJob).filter(Boolean);
      const spotlightById = new Map(spotlightJobs.map((job) => [job.id, job]));

      const mergedJobs = baseJobs.map((job) => ({
        ...job,
        activity: spotlightById.get(job.id) ?? null,
      }));

      const updatesOnly = spotlightJobs
        .filter((job) => !baseJobs.some((b) => b.id === job.id))
        .filter((job) => job.notices.length > 0 || job.shortlisted.length > 0)
        .map((job) => ({
          id: job.id, title: job.title, company: job.company || 'NTH Hiring Partner',
          city: job.city || '—', experience: 'Hiring Update', requirements: [],
          isFree: true, applyLink: `/jobs/${job.id}`,
          applicationDeadline: null, walkInDate: null, address: '',
          isExpired: false, activity: job, isUpdatesOnly: true,
        }));

      setLandingJobs([...mergedJobs, ...updatesOnly]);
      setLoading(false);
    };
    fetchJobs();
  }, [isDirectory]);

  const regularJobs = useMemo(() => landingJobs.filter((j) => !j.isUpdatesOnly), [landingJobs]);
  const updatesOnlyJobs = useMemo(() => landingJobs.filter((j) => j.isUpdatesOnly), [landingJobs]);
  const hasFresherJobs = regularJobs.some((j) => j.experience === 'Fresher' || j.experience === 'Fresher & Experienced');
  const hasExperiencedJobs = regularJobs.some((j) => j.experience === 'Experienced' || j.experience === 'Fresher & Experienced');

  const experienceFilteredJobs = useMemo(() => {
    if (regularJobs.length === 0) return updatesOnlyJobs;
    if (!hasFresherJobs) return [...regularJobs.filter((j) => j.experience === 'Experienced'), ...updatesOnlyJobs];
    if (!hasExperiencedJobs) return [...regularJobs.filter((j) => j.experience === 'Fresher' || j.experience === 'Fresher & Experienced'), ...updatesOnlyJobs];
    return [...regularJobs, ...updatesOnlyJobs];
  }, [regularJobs, updatesOnlyJobs, hasFresherJobs, hasExperiencedJobs]);

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

  const freeJobs = useMemo(() => experienceFilteredJobs.filter((j) => j.isFree), [experienceFilteredJobs]);
  const premiumJobs = useMemo(() => experienceFilteredJobs.filter((j) => !j.isFree), [experienceFilteredJobs]);

  const showViewAll = Boolean(
    viewAllTo && previewLimit != null && previewLimit > 0
    && (showTabSelector
      ? freeJobs.length > previewLimit || premiumJobs.length > previewLimit
      : experienceFilteredJobs.length > previewLimit),
  );

  if (!loading && landingJobs.length === 0 && hideWhenEmpty) return null;

  const sectionPad = isDirectory
    ? 'pt-8 sm:pt-10 pb-12 sm:pb-16'
    : 'nth-section-y scroll-mt-24';

  return (
    <section
      id="job-openings"
      className={`relative scroll-mt-24 overflow-x-clip overflow-y-visible ${sectionPad}`}
      style={{
        background: 'linear-gradient(160deg, #f5f3ff 0%, #ffffff 40%, #eef2ff 100%)',
      }}
    >
      {/* subtle dot grid bg */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, #6366f1 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      <SectionContainer useGrid wider className="relative z-10">

        {/* ── Section header ── */}
        <div className="col-span-full text-center px-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold uppercase tracking-wide mb-3 sm:mb-4 border border-indigo-200/60">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            {isDirectory ? 'All openings' : 'Currently Hiring'}
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2 sm:mb-3 leading-tight">
            {isDirectory ? (
              <>Browse every{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">open position</span>
              </>
            ) : (
              <>Find your next{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">career opportunity</span>
              </>
            )}
          </h2>

          <p className="text-slate-600 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            {isDirectory
              ? 'All curated roles — free and premium — in one place.'
              : 'Hand-picked positions with live hiring updates. Your perfect role is waiting.'}
          </p>
        </div>

        {/* ── Tab selector ── */}
        {showTabSelector && (
          <div className="col-span-full flex justify-center px-4">
            <div className="inline-flex p-1 rounded-2xl bg-white border border-slate-200 shadow-sm gap-1">
              {[
                { key: 'free', label: 'Free', Icon: HiSparkles, count: freeJobs.length },
                { key: 'premium', label: 'Premium', Icon: HiBriefcase, count: premiumJobs.length },
              ].map(({ key, label, Icon, count }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`relative cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
                    ${activeTab === key
                      ? key === 'free'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                        : 'bg-violet-600 text-white shadow-md shadow-violet-200'
                      : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold
                    ${activeTab === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Job list ── */}
        <div className="col-span-full px-4 sm:px-6 lg:px-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <PageLoader size="lg" label="Loading jobs…" variant="dots" />
            </div>
          ) : landingJobs.length === 0 ? (
            <EmptyState message="No positions available right now" />
          ) : (
            <div
              key={activeTab}
              className={
                isDirectory
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 w-full max-w-6xl mx-auto'
                  : 'flex flex-col gap-5 w-full items-stretch max-w-5xl mx-auto'
              }
            >
              {displayJobs.length > 0 ? (
                displayJobs.map((job) =>
                  isDirectory ? (
                    <JobCardDirectory
                      key={job.id} job={job}
                      hoveredId={hoveredId} setHoveredId={setHoveredId}
                      isAuthenticated={isAuthenticated} pricingTo={pricingTo}
                    />
                  ) : (
                    <JobRowLanding
                      key={job.id} job={job}
                      hoveredId={hoveredId} setHoveredId={setHoveredId}
                      isAuthenticated={isAuthenticated} pricingTo={pricingTo}
                    />
                  )
                )
              ) : (
                <div className="col-span-full">
                  <EmptyState message={showTabSelector ? `No ${activeTab} positions right now` : 'No positions available right now'} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── View all CTA ── */}
        {showViewAll && (
          <div className="col-span-full flex justify-center px-4 pt-4 pb-1">
            <Link
              to={viewAllTo}
              className="group inline-flex items-center gap-2.5 rounded-2xl bg-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/30 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
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

function EmptyState({ message }) {
  return (
    <div className="text-center py-10 sm:py-12 px-4">
      <div className="inline-flex flex-col items-center gap-3 p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 max-w-sm mx-auto shadow-sm">
        <div className="w-14 h-14 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
          <HiBriefcase className="w-7 h-7 text-indigo-400" />
        </div>
        <div>
          <p className="text-slate-800 font-semibold mb-1">{message}</p>
          <p className="text-slate-500 text-sm">Check back soon for new opportunities</p>
        </div>
      </div>
    </div>
  );
}