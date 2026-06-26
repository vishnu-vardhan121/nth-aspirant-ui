/**
 * JobOpeningsSection - redesigned with polished UI
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
import ApplyDeadlineCountdown from '../../../../components/ApplyDeadlineCountdown';
import { PageLoader } from '../../../../components/ui/Loader';
import {
  formatApplyDeadlineShort,
  isApplyDeadlinePassed,
} from '../../../../lib/jobApplicationDeadline';
import { useState, useEffect, useMemo } from 'react';
import { useAppSelector } from '../../../../store/hooks';
import { supabase } from '../../../../lib/supabase';
import {
  getDashboardJobsAuthPath,
  getExternalApplyHref,
  isExternalApplyLink,
} from '../../../../lib/authUtils';

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

/** Admin `key_skills` (text[] or JSON); also tolerates legacy string lists. */
function normalizeKeySkillsVal(value) {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map((s) => String(s ?? '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) return [];
    try {
      return normalizeKeySkillsVal(JSON.parse(t));
    } catch {
      return t.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    }
  }
  if (typeof value === 'object') {
    return coerceJsonArray(value).map((s) => String(s ?? '').trim()).filter(Boolean);
  }
  return [];
}

function normalizeSpotlightJob(job) {
  if (!job || typeof job !== 'object' || !job.id) return null;
  return {
    id: job.id,
    title: job.title ?? 'Hiring role',
    company: job.company_name ?? '',
    city: job.location ?? '-',
    application_deadline: job.application_deadline ?? null,
    application_deadline_at: job.application_deadline_at ?? null,
    job_status: job.job_status ?? job.status ?? 'open',
    key_skills: normalizeKeySkillsVal(job.key_skills),
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
      className={`inline-flex items-center gap-1 pl-0.5 pr-2 py-0.5 rounded-full border text-[10px] font-semibold ${color} max-w-[160px] truncate`}
    >
      <span
        className={`inline-flex shrink-0 items-center justify-center w-4 h-4 rounded-full bg-white/80 text-[8px] font-bold ${color.split(' ')[1]}`}
      >
        {initials}
      </span>
      <span className="min-w-0 truncate">{name ?? 'Candidate'}</span>
    </span>
  );
}

/* ─────────────────────────────────────── Badge ─── */
function Badge({ free }) {
  return free ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 text-[10px] font-bold tracking-wide border border-indigo-200/80 uppercase">
      <HiSparkles className="w-3 h-3 shrink-0 text-indigo-500" />
      Free
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-800 text-[10px] font-bold tracking-wide border border-violet-200/80 uppercase">
      <HiBriefcase className="w-3 h-3 shrink-0 text-violet-500" />
      Premium
    </span>
  );
}

const freeApplyBtnClass =
  'flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600';

/* ─────────────────────────────────────── CTA button ─── */
function CtaButton({ job, isAuthenticated, pricingTo }) {
  const canView = job.isFree || isAuthenticated;
  const status = job.jobStatus ?? 'open';
  const applyClosed = job.isExpired || status !== 'open';

  if (applyClosed) {
    return (
      <div className="w-full text-center px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 bg-slate-100/90 border border-slate-200 cursor-not-allowed select-none">
        {job.isUpdatesOnly ? 'Role no longer open' : status === 'closed' ? 'Applications closed' : 'Application closed'}
      </div>
    );
  }
  if (canView) {
    if (job.isUpdatesOnly) {
      return (
        <Link
          to={`/jobs/${job.id}`}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          See hiring updates <HiArrowRight className="w-4 h-4 shrink-0" />
        </Link>
      );
    }
    if (job.isFree) {
      if (isExternalApplyLink(job.applyLink)) {
        return (
          <a
            href={getExternalApplyHref(job.applyLink)}
            target="_blank"
            rel="noopener noreferrer"
            className={freeApplyBtnClass}
          >
            Apply Now <HiArrowRight className="w-4 h-4 shrink-0" />
          </a>
        );
      }
      return (
        <Link to={getDashboardJobsAuthPath(isAuthenticated)} className={freeApplyBtnClass}>
          Apply Now <HiArrowRight className="w-4 h-4 shrink-0" />
        </Link>
      );
    }
    return (
      <Link
        to={pricingTo}
        className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl font-semibold text-sm bg-violet-600 hover:bg-violet-700 text-white shadow-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
      >
        View Plans to Apply <HiArrowRight className="w-4 h-4 shrink-0" />
      </Link>
    );
  }
  return (
    <Link
      to={pricingTo}
      className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl font-semibold text-sm border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 bg-white transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      <HiLockClosed className="w-4 h-4 shrink-0" />
      Unlock Position
    </Link>
  );
}

/* ─────────────────────────────────────── Apply deadline strip ─── */
function DeadlineApplyStrip({ job, compact = false }) {
  const hasDeadline =
    job.applicationDeadlineRaw || job.applicationDeadline || job.applicationDeadlineAt;
  if (!hasDeadline) return null;
  const status = job.jobStatus ?? 'open';
  const applyClosed = job.isExpired || status !== 'open';
  const pad = compact ? 'px-2.5 py-2' : 'px-3 py-2.5';
  const rounded = compact ? 'rounded-lg' : 'rounded-xl';

  if (applyClosed) {
    return (
      <div
        className={`${rounded} border border-slate-200/90 bg-slate-50/90 ${pad} ring-1 ring-slate-100/80`}
      >
        <p
          className={`font-semibold uppercase tracking-wider text-slate-500 ${compact ? 'text-[9px] mb-0.5' : 'text-[10px] mb-1'}`}
        >
          Apply by
        </p>
        {job.applicationDeadline ? (
          <p className={`font-semibold text-slate-800 ${compact ? 'text-[11px]' : 'text-sm'}`}>
            {job.applicationDeadline}
          </p>
        ) : (
          <p className={`text-slate-600 ${compact ? 'text-[11px]' : 'text-sm'}`}>Deadline was set</p>
        )}
        <p className={`text-slate-500 leading-snug ${compact ? 'text-[10px] mt-1' : 'text-xs mt-1.5'}`}>
          {status !== 'open'
            ? 'This role is not accepting new applications.'
            : 'The apply window for this listing has ended.'}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`${rounded} border border-amber-200/80 bg-linear-to-br from-amber-50/95 via-white to-orange-50/40 ${pad} shadow-sm shadow-amber-100/30 ring-1 ring-amber-100/50`}
    >
      <div className={`flex items-start justify-between gap-2 ${compact ? 'mb-1' : 'mb-1.5'}`}>
        <p
          className={`font-bold uppercase tracking-wider text-amber-900/85 ${compact ? 'text-[9px]' : 'text-[10px]'}`}
        >
          Apply closes
        </p>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-200/70 bg-amber-100/70 font-semibold text-amber-900/90 ${compact ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-0.5'}`}
        >
          <HiClock className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} aria-hidden />
          IST
        </span>
      </div>
      {job.applicationDeadline ? (
        <p
          className={`font-bold tabular-nums text-amber-950 ${compact ? 'text-[10px] mb-1' : 'text-sm mb-1.5'}`}
        >
          {job.applicationDeadline}
        </p>
      ) : null}
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-t border-amber-200/50 pt-1.5">
        <span className={`font-medium text-amber-900/80 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
          Time remaining
        </span>
        <ApplyDeadlineCountdown
          applicationDeadlineAt={job.applicationDeadlineAt}
          applicationDeadlineDate={job.applicationDeadlineRaw}
          className={compact ? 'text-[10px]' : 'text-xs'}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── Message bubble ─── */
function MessageBubble({ text, index, timeLabel }) {
  return (
    <li className="flex gap-2">
      <div className="flex shrink-0 flex-col items-center pt-0.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white shadow-sm ring-1 ring-white">
          {index + 1}
        </span>
      </div>
      <div className="min-w-0 flex-1 rounded-lg border border-slate-100 bg-white px-2.5 py-1.5 shadow-sm">
        <p className="text-xs leading-snug text-slate-700">{text}</p>
        {timeLabel ? (
          <p className="mt-1 text-[10px] font-medium tabular-nums text-slate-400">{timeLabel}</p>
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
      className={`relative w-full overflow-hidden rounded-2xl border bg-white transition-all duration-200
        ${job.isFree ? 'border-slate-200/90 hover:border-indigo-200' : 'border-slate-200/90 hover:border-violet-200'}
        ${isHovered ? 'shadow-lg shadow-indigo-200/20 ring-1 ring-indigo-100/70' : 'shadow-md shadow-slate-200/30'}
      `}
    >
      <div
        className={`h-1 w-full ${job.isFree ? 'bg-linear-to-r from-indigo-600 via-indigo-500 to-violet-500' : 'bg-linear-to-r from-violet-600 via-violet-500 to-fuchsia-500'}`}
      />

      <div className="grid grid-cols-1 divide-y divide-slate-100 lg:grid-cols-12 lg:divide-x lg:divide-y-0">
        {/* LEFT: role summary */}
        <div className="flex flex-col gap-3 bg-white p-4 sm:p-5 lg:col-span-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge free={job.isFree} />
              {job.isUpdatesOnly && (
                <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                  Spotlight
                </span>
              )}
              {((job.jobStatus ?? 'open') !== 'open' || job.isExpired) && (
                <span className="inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                  Apply closed
                </span>
              )}
            </div>
            <span className="rounded-full border border-slate-200/80 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              {job.experience}
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="line-clamp-2 text-lg font-bold leading-snug tracking-tight text-slate-900 sm:text-xl">
              {job.title}
            </h3>
            {canView ? (
              <p className="text-xs font-semibold text-indigo-600">{job.company || 'NTH Hiring Partner'}</p>
            ) : (
              <div className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600">
                <HiLockClosed className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                Premium members only
              </div>
            )}
          </div>

          {job.requirements?.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Key skills</p>
              <div className="flex flex-wrap gap-1.5">
                {job.requirements.slice(0, 8).map((req) => (
                  <span
                    key={req}
                    className="rounded-full border border-indigo-100 bg-indigo-50/90 px-2 py-0.5 text-[11px] font-semibold text-indigo-900"
                  >
                    {req}
                  </span>
                ))}
                {job.requirements.length > 8 && (
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    +{job.requirements.length - 8}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 text-xs text-slate-600">
            {job.city && job.city !== '-' && (
              <span className="inline-flex items-center gap-1.5 text-slate-700">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <HiMapPin className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="font-medium">{job.city}</span>
              </span>
            )}
            <DeadlineApplyStrip job={job} />
          </div>

          <div className="mt-auto border-t border-slate-100 pt-3">
            <CtaButton job={job} isAuthenticated={isAuthenticated} pricingTo={pricingTo} />
          </div>
        </div>

        {/* RIGHT: hiring timeline */}
        <div className="flex flex-col gap-3 bg-linear-to-b from-indigo-50/30 via-white to-slate-50/35 p-4 sm:p-5 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="mb-0 flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-35" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500" />
                </span>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Hiring timeline</p>
              </div>
              <p className="text-[10px] text-slate-500">Updates from the hiring team</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {hasMessages && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  <HiChatBubbleLeftRight className="h-3 w-3 text-indigo-500" />
                  {recentNotices.length} update{recentNotices.length !== 1 ? 's' : ''}
                </span>
              )}
              {hasCandidates && (
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50/80 px-2 py-0.5 text-[10px] font-semibold text-indigo-800">
                  <HiUserGroup className="h-3 w-3" />
                  {shortlisted.length} shortlisted
                </span>
              )}
            </div>
          </div>

          <div className="max-h-[200px] min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-100/90 bg-white/90 shadow-inner shadow-slate-100/50">
            {hasMessages ? (
              <ul className="space-y-1.5 p-2.5 sm:p-3">
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
              <div className="flex flex-col items-center justify-center gap-1.5 px-3 py-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-300 ring-1 ring-indigo-100/80">
                  <HiChatBubbleLeftRight className="h-5 w-5" aria-hidden />
                </span>
                <p className="text-center text-xs font-medium text-slate-500">No timeline messages yet</p>
                <p className="max-w-[240px] text-center text-[10px] leading-relaxed text-slate-400">
                  Updates appear when the team posts hiring news.
                </p>
              </div>
            )}
          </div>

          {hasCandidates && (
            <div className="rounded-xl border border-indigo-100/90 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-1.5">
                <HiCheckBadge className="h-4 w-4 shrink-0 text-indigo-500" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">Shortlisted</p>
                <span className="ml-auto text-[10px] font-semibold text-slate-400">
                  {shortlisted.length} candidate{shortlisted.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {shortlisted.slice(0, 24).map((person, i) => (
                  <AvatarChip key={`${job.id}-s-${i}`} name={person?.name} />
                ))}
                {shortlisted.length > 24 && (
                  <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                    +{shortlisted.length - 24}
            </span>
                )}
              </div>
            </div>
          )}

          <Link
            to={`/jobs/${job.id}`}
            className="mt-auto inline-flex w-full min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-indigo-200 bg-white px-4 py-2.5 text-xs font-bold text-indigo-800 shadow-sm transition-[background-color,border-color,box-shadow,color] duration-150 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Open full role & hiring updates
            <HiArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
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
      className={`relative flex flex-col self-start overflow-hidden rounded-2xl border bg-white transition-all duration-200
        ${job.isFree ? 'border-slate-200/90 hover:border-indigo-200' : 'border-slate-200/90 hover:border-violet-200'}
        ${isHovered ? 'shadow-lg shadow-indigo-200/15 ring-1 ring-indigo-100/60' : 'shadow-md shadow-slate-200/30'}
      `}
    >
      <div
        className={`h-1 w-full ${job.isFree ? 'bg-linear-to-r from-indigo-600 to-indigo-400' : 'bg-linear-to-r from-violet-600 to-violet-400'}`}
      />

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge free={job.isFree} />
            {((job.jobStatus ?? 'open') !== 'open' || job.isExpired) && (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                Apply closed
              </span>
            )}
          </div>
          <span className="whitespace-nowrap rounded-full border border-slate-200/80 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            {job.experience}
          </span>
        </div>

        <div>
          <h3 className="mb-0.5 line-clamp-2 text-base font-bold leading-snug tracking-tight text-slate-900">
          {job.title}
        </h3>
          {job.isUpdatesOnly && (
            <span className="mb-1 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
              Spotlight
            </span>
          )}
          {canView ? (
            <p className="text-xs font-semibold text-indigo-600">{job.company || 'NTH Hiring Partner'}</p>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-500">
              <HiLockClosed className="h-3 w-3 shrink-0" />
              Premium only
            </div>
          )}
          {job.requirements?.length > 0 && (
            <div className="mt-2.5">
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">Key skills</p>
              <div className="flex flex-wrap gap-1.5">
                {job.requirements.slice(0, 5).map((req) => (
                  <span
                    key={req}
                    className="rounded-full border border-indigo-100 bg-indigo-50/90 px-2 py-0.5 text-[11px] font-semibold text-indigo-900"
                  >
                    {req}
                  </span>
                ))}
                {job.requirements.length > 5 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    +{job.requirements.length - 5}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 text-[11px] text-slate-600">
          {job.city && job.city !== '-' && (
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
              <HiMapPin className="h-3 w-3 shrink-0 text-slate-400" />
              {job.city}
            </span>
          )}
          <DeadlineApplyStrip job={job} compact />
        </div>

        {hasActivity && (
          <div className="max-h-[180px] space-y-2 overflow-y-auto rounded-xl border border-slate-100 bg-linear-to-b from-slate-50/80 to-white p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Hiring activity</p>
              </div>
              <span className="text-[9px] font-semibold text-slate-400">
                {notices.length + shortlisted.length} updates
              </span>
            </div>

            {notices.length > 0 && (
              <ul className="space-y-1.5">
                {notices.slice(0, 3).map((item, i) => (
                  <MessageBubble
                    key={i}
                    text={item?.message ?? ''}
                    index={i}
                    timeLabel={formatNoticeTimeLabel(item)}
                  />
                ))}
              </ul>
            )}

            {shortlisted.length > 0 && (
              <div>
                <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">Shortlisted</p>
                <div className="flex flex-wrap gap-1">
                  {shortlisted.slice(0, 6).map((person, i) => (
                    <AvatarChip key={i} name={person?.name} />
                  ))}
                  {shortlisted.length > 6 && (
                    <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-800">
                      +{shortlisted.length - 6}
              </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-auto border-t border-slate-100 pt-3">
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
    const mapLandingJobs = (data) => data.map((j) => {
          const tracks = Array.isArray(j.audience_tracks) ? j.audience_tracks : [];
          const hasFresher = tracks.includes('fresher');
          const hasExperienced = tracks.includes('experienced');
          const experienceLabel = hasFresher && hasExperienced
            ? 'Fresher & Experienced'
        : hasFresher ? 'Fresher' : hasExperienced ? 'Experienced' : 'Fresher';
      const rawDeadline = j.application_deadline != null ? String(j.application_deadline).slice(0, 10) : null;
      const jobStatus = j.status ?? 'open';
          return {
        id: j.id, title: j.title, company: j.company_name ?? '', city: j.location ?? '-',
            experience: experienceLabel,
        requirements: normalizeKeySkillsVal(j.key_skills),
            isFree: !(j.allowed_plans && j.allowed_plans.length),
            applyLink: j.apply_link || '/dashboard/jobs',
        applicationDeadline: formatApplyDeadlineShort(j.application_deadline_at, j.application_deadline),
        applicationDeadlineRaw: rawDeadline,
        applicationDeadlineAt: j.application_deadline_at ?? null,
            walkInDate: formatDate(j.walk_in_date),
            address: j.address ?? '',
        jobStatus,
        isExpired: isApplyDeadlinePassed({
          application_deadline_at: j.application_deadline_at,
          application_deadline: j.application_deadline,
        }),
        activity: null, isUpdatesOnly: false,
      };
    });

    const fetchJobs = async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, company_name, location, audience_tracks, allowed_plans, application_deadline, application_deadline_at, walk_in_date, address, apply_link, status, key_skills')
        .eq('show_on_landing', true)
        .order('created_at', { ascending: false });

      if (error || !data) { setLandingJobs([]); setLoading(false); return; }

      const baseJobs = mapLandingJobs(data);
      const { data: spotlightData } = await supabase.rpc('get_landing_hiring_spotlight');
      const spotlightJobs = parseSpotlightPayload(spotlightData).map(normalizeSpotlightJob).filter(Boolean);
      const spotlightById = new Map(spotlightJobs.map((job) => [job.id, job]));

      const mergedJobs = baseJobs.map((job) => {
        const spot = spotlightById.get(job.id);
        const fromSpot = spot?.key_skills?.length ? spot.key_skills : [];
        const requirements = job.requirements?.length ? job.requirements : fromSpot;
        const at = job.applicationDeadlineAt ?? spot?.application_deadline_at ?? null;
        return {
          ...job,
          requirements,
          activity: spot ?? null,
          applicationDeadlineAt: at,
          applicationDeadline: formatApplyDeadlineShort(at, job.applicationDeadlineRaw),
        };
      });

      const updatesOnly = spotlightJobs
        .filter((job) => !baseJobs.some((b) => b.id === job.id))
        .filter((job) => job.notices.length > 0 || job.shortlisted.length > 0)
        .map((job) => {
          const rawDl = job.application_deadline != null ? String(job.application_deadline).slice(0, 10) : null;
          const at = job.application_deadline_at ?? null;
          const st = job.job_status ?? 'open';
          return {
            id: job.id,
            title: job.title,
            company: job.company || 'NTH Hiring Partner',
            city: job.city || '-',
            experience: 'Hiring Update',
            requirements: job.key_skills ?? [],
            isFree: true,
            applyLink: `/jobs/${job.id}`,
            applicationDeadline: formatApplyDeadlineShort(at, job.application_deadline),
            applicationDeadlineRaw: rawDl,
            applicationDeadlineAt: at,
            walkInDate: null,
            address: '',
            jobStatus: st,
            isExpired: isApplyDeadlinePassed({
              application_deadline_at: job.application_deadline_at,
              application_deadline: job.application_deadline,
            }),
            activity: job,
            isUpdatesOnly: true,
          };
        });

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
                <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-violet-600">open position</span>
              </>
            ) : (
              <>Find your next{' '}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-violet-600">career opportunity</span>
              </>
            )}
          </h2>

          <p className="text-slate-600 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            {isDirectory
              ? 'All curated roles - free and premium - in one place.'
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