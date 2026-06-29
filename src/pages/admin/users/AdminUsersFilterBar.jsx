import { useMemo, useState } from 'react';
import { HiChevronDown, HiChevronUp, HiXMark } from 'react-icons/hi2';
import {
  JOB_DOMAIN_OPTIONS,
  QUALIFICATION_OPTIONS,
  COMMUNICATION_LEVEL_OPTIONS,
  INSTITUTE_TIER_SELECT_OPTIONS,
  NOTICE_PERIOD_OPTIONS,
  getBranchOptions,
} from '../../../lib/aspirantFilterOptions';
import { MOCK_TOPIC_FILTER_OPTIONS, MOCK_ROLE_FIT_CATEGORIES } from '../../../lib/mockFeedbackTopics';
import { INITIAL_USER_FILTERS } from './constants';

const selectClass =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';
const inputClass = selectClass;

function countActiveFilters(filters) {
  return Object.keys(INITIAL_USER_FILTERS).reduce((count, key) => {
    const value = filters[key];
    const defaultValue = INITIAL_USER_FILTERS[key];
    if (key === 'mockTopicMode') return count + (value && value !== 'any' ? 1 : 0);
    if (value == null || value === '' || value === defaultValue) return count;
    return count + 1;
  }, 0);
}

function FilterGroup({ label, children }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export default function AdminUsersFilterBar({ filters, onPatch, onQualificationChange, onReset }) {
  const [expanded, setExpanded] = useState(true);
  const set = (key) => (e) => onPatch({ [key]: e.target.value });
  const activeCount = useMemo(() => countActiveFilters(filters), [filters]);

  return (
    <div className="border-b border-slate-200 bg-slate-50/80">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {expanded ? <HiChevronUp className="h-4 w-4" /> : <HiChevronDown className="h-4 w-4" />}
            Filters
            {activeCount > 0 ? (
              <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
                {activeCount}
              </span>
            ) : null}
          </button>
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900"
            >
              <HiXMark className="h-4 w-4" />
              Clear all
            </button>
          ) : null}
        </div>
        <div className="flex min-w-[240px] flex-1 items-center gap-2 sm:max-w-md sm:flex-none">
          <input
            type="search"
            value={filters.search}
            onChange={set('search')}
            placeholder="Search name, email, role, college…"
            className={`${inputClass} w-full`}
          />
        </div>
      </div>

      {expanded ? (
        <div className="grid gap-3 px-4 pb-4 lg:grid-cols-2 xl:grid-cols-3">
          <FilterGroup label="Plan & track">
            <select value={filters.profileStatus} onChange={set('profileStatus')} className={selectClass}>
              <option value="">All profiles</option>
              <option value="active">Active in pool</option>
              <option value="inactive">Placed / inactive</option>
            </select>
            <select value={filters.plan} onChange={set('plan')} className={selectClass}>
              <option value="">All plans</option>
              <option value="base">Base</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
            </select>
            <select value={filters.track} onChange={set('track')} className={selectClass}>
              <option value="">All tracks</option>
              <option value="fresher">Fresher</option>
              <option value="experienced">Experienced</option>
            </select>
            <select value={filters.domain} onChange={set('domain')} className={`${selectClass} min-w-[140px]`}>
              <option value="">All domains</option>
              {JOB_DOMAIN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FilterGroup>

          <FilterGroup label="Education">
            <select
              value={filters.qualification}
              onChange={(e) => onQualificationChange(e.target.value)}
              className={selectClass}
            >
              <option value="">All qualifications</option>
              {QUALIFICATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={filters.branch}
              onChange={set('branch')}
              className={selectClass}
              disabled={!filters.qualification}
            >
              <option value="">All branches</option>
              {getBranchOptions(filters.qualification).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={filters.batch}
              onChange={set('batch')}
              placeholder="Grad year"
              className={`${inputClass} w-28`}
            />
            <input
              type="number"
              step="0.1"
              min="0"
              value={filters.cgpaMin}
              onChange={set('cgpaMin')}
              placeholder="CGPA ≥"
              className={`${inputClass} w-24`}
            />
            <select value={filters.tier} onChange={set('tier')} className={selectClass}>
              <option value="">All tiers</option>
              {INSTITUTE_TIER_SELECT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FilterGroup>

          <FilterGroup label="Profile">
            <select value={filters.communication} onChange={set('communication')} className={selectClass}>
              <option value="">Any communication</option>
              {COMMUNICATION_LEVEL_OPTIONS.filter((o) => o.value !== 'not_assessed').map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select value={filters.noticePeriod} onChange={set('noticePeriod')} className={selectClass}>
              <option value="">Any notice</option>
              {NOTICE_PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={filters.skills}
              onChange={set('skills')}
              placeholder="Skills: react, java"
              className={`${inputClass} min-w-[160px] flex-1`}
            />
          </FilterGroup>

          <FilterGroup label="Mock scores">
            <input
              type="number"
              min="1"
              max="10"
              value={filters.mockOverallMin}
              onChange={set('mockOverallMin')}
              placeholder="Overall ≥"
              className={`${inputClass} w-28`}
            />
            <input
              type="number"
              min="1"
              max="10"
              value={filters.mockCommMin}
              onChange={set('mockCommMin')}
              placeholder="Comm ≥"
              className={`${inputClass} w-28`}
            />
            <select value={filters.mockTopicKey} onChange={set('mockTopicKey')} className={`${selectClass} min-w-[130px]`}>
              <option value="">Any topic</option>
              {MOCK_TOPIC_FILTER_OPTIONS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              max="10"
              value={filters.mockTopicScoreMin}
              onChange={set('mockTopicScoreMin')}
              placeholder="Topic ≥"
              disabled={!filters.mockTopicKey}
              className={`${inputClass} w-24 disabled:opacity-50`}
            />
            <input
              type="number"
              min="0"
              max="10"
              value={filters.mockTopicScoreMax}
              onChange={set('mockTopicScoreMax')}
              placeholder="Topic ≤"
              disabled={!filters.mockTopicKey}
              className={`${inputClass} w-24 disabled:opacity-50`}
            />
            <select
              value={filters.mockTopicMode}
              onChange={set('mockTopicMode')}
              disabled={!filters.mockTopicKey}
              className={`${selectClass} disabled:opacity-50`}
            >
              <option value="any">Any mock</option>
              <option value="best">Best score</option>
              <option value="latest">Latest mock</option>
            </select>
          </FilterGroup>

          <FilterGroup label="Role fit (internal)">
            <select
              value={filters.roleFitKey}
              onChange={set('roleFitKey')}
              className={`${selectClass} min-w-[180px]`}
            >
              <option value="">Any role fit</option>
              {MOCK_ROLE_FIT_CATEGORIES.map((cat) => (
                <optgroup key={cat.id} label={cat.label}>
                  {cat.options.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-xs text-slate-500">From interviewer mock feedback — not shown to aspirants</p>
          </FilterGroup>
        </div>
      ) : null}
    </div>
  );
}
