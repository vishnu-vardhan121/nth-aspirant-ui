import { useMemo } from 'react';
import { HiChevronDown, HiChevronUp, HiXMark } from 'react-icons/hi2';
import { MOCK_TOPIC_FILTER_OPTIONS, MOCK_ROLE_FIT_CATEGORIES } from '../../../lib/mockFeedbackTopics';
import {
  INITIAL_JOB_APPLICANT_FILTERS,
  PLANS,
  countActiveJobApplicantFilters,
  togglePlanInFilters,
} from './jobApplicantFilters';
import {
  JOB_APPLICATION_STATUS_OPTIONS,
  PLACEMENT_READINESS_FILTER_OPTIONS,
} from '../placementFilterOptions';

const selectClass =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';
const inputClass = selectClass;

function FilterGroup({ label, children }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex flex-wrap items-end gap-3">{children}</div>
    </div>
  );
}

function FilterField({ label, children }) {
  return (
    <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function PlanChip({ plan, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(plan.value)}
      className={[
        'rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors',
        selected
          ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
          : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50',
      ].join(' ')}
      aria-pressed={selected}
    >
      {plan.label}
    </button>
  );
}

export default function JobApplicantsFilterBar({ filters, onChange, onReset, expanded, onToggleExpanded }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });
  const activeCount = useMemo(() => countActiveJobApplicantFilters(filters), [filters]);
  const selectedPlans = filters.plans ?? [];

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/80 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleExpanded}
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
      </div>

      {expanded ? (
        <div className="grid gap-3 border-t border-slate-200 px-4 pb-4 pt-3 lg:grid-cols-2 xl:grid-cols-3">
          <FilterGroup label="This job application">
            <FilterField label="Application status">
              <select value={filters.applicationStatus} onChange={set('applicationStatus')} className={selectClass}>
                {JOB_APPLICATION_STATUS_OPTIONS.map((o) => (
                  <option key={o.value || 'any'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Placement readiness">
              <select value={filters.placementPipeline} onChange={set('placementPipeline')} className={selectClass}>
                {PLACEMENT_READINESS_FILTER_OPTIONS.map((o) => (
                  <option key={o.value || 'any'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FilterField>
          </FilterGroup>

          <FilterGroup label="Subscription plans">
            {PLANS.map((plan) => (
              <PlanChip
                key={plan.value}
                plan={plan}
                selected={selectedPlans.includes(plan.value)}
                onToggle={(value) => onChange(togglePlanInFilters(filters, value))}
              />
            ))}
            {selectedPlans.length === 0 ? (
              <span className="text-xs text-slate-500">All plans</span>
            ) : null}
          </FilterGroup>

          <FilterGroup label="Mock interview scores">
            <input
              type="number"
              min="0"
              max="10"
              value={filters.mockOverallMin}
              onChange={set('mockOverallMin')}
              placeholder="Overall ≥"
              aria-label="Minimum overall mock score"
              className={`${inputClass} w-28`}
            />
            <input
              type="number"
              min="0"
              max="10"
              value={filters.mockCommMin}
              onChange={set('mockCommMin')}
              placeholder="Communication ≥"
              aria-label="Minimum communication score"
              className={`${inputClass} w-36`}
            />
            <input
              type="number"
              min="0"
              max="10"
              value={filters.mockTechnicalMin}
              onChange={set('mockTechnicalMin')}
              placeholder="Technical ≥"
              aria-label="Minimum technical score"
              className={`${inputClass} w-32`}
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
            <select value={filters.roleFitKey} onChange={set('roleFitKey')} className={`${selectClass} min-w-[180px]`}>
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
          </FilterGroup>
        </div>
      ) : null}
    </div>
  );
}

export { INITIAL_JOB_APPLICANT_FILTERS };
