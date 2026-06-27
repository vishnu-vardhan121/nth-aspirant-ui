import {
  JOB_DOMAIN_OPTIONS,
  QUALIFICATION_OPTIONS,
  COMMUNICATION_LEVEL_OPTIONS,
  PREMIER_INSTITUTE_OPTIONS,
  INSTITUTE_TIER_SELECT_OPTIONS,
  NOTICE_PERIOD_OPTIONS,
  getBranchOptions,
} from '../../../lib/aspirantFilterOptions';

const selectClass = 'rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 bg-white';
const inputClass = `${selectClass}`;

export default function AdminUsersFilterBar({ filters, onPatch, onQualificationChange }) {
  const set = (key) => (e) => onPatch({ [key]: e.target.value });

  return (
    <div className="p-4 border-b border-slate-200">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={filters.search}
          onChange={set('search')}
          placeholder="Search name, email, role, college"
          className={`${inputClass} min-w-[200px]`}
        />
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
        <select value={filters.domain} onChange={set('domain')} className={selectClass}>
          <option value="">All target domains</option>
          {JOB_DOMAIN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={filters.qualification}
          onChange={(e) => onQualificationChange(e.target.value)}
          className={selectClass}
        >
          <option value="">All qualifications</option>
          {QUALIFICATION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
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
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input type="number" value={filters.batch} onChange={set('batch')} placeholder="Batch year" className={`${inputClass} w-28`} />
        <input type="number" step="0.1" min="0" value={filters.cgpaMin} onChange={set('cgpaMin')} placeholder="CGPA min" className={`${inputClass} w-28`} />
        <select value={filters.communication} onChange={set('communication')} className={selectClass}>
          <option value="">Communication</option>
          {COMMUNICATION_LEVEL_OPTIONS.filter((o) => o.value !== 'not_assessed').map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select value={filters.noticePeriod} onChange={set('noticePeriod')} className={selectClass}>
          <option value="">Notice period</option>
          {NOTICE_PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select value={filters.premier} onChange={set('premier')} className={selectClass}>
          <option value="">Premier</option>
          {PREMIER_INSTITUTE_OPTIONS.filter((o) => o.value !== 'none').map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select value={filters.tier} onChange={set('tier')} className={selectClass}>
          <option value="">College tier</option>
          {INSTITUTE_TIER_SELECT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={filters.skills}
          onChange={set('skills')}
          placeholder="Skills: react, java"
          className={`${inputClass} min-w-[140px]`}
        />
        <input
          type="number"
          min="1"
          max="10"
          step="1"
          value={filters.mockOverallMin}
          onChange={set('mockOverallMin')}
          placeholder="Mock overall ≥"
          title="Latest mock overall score (1–10)"
          className={`${inputClass} w-32`}
        />
        <input
          type="number"
          min="1"
          max="10"
          step="1"
          value={filters.mockCommMin}
          onChange={set('mockCommMin')}
          placeholder="Mock comm ≥"
          title="Latest mock communication score (1–10)"
          className={`${inputClass} w-32`}
        />
      </div>
    </div>
  );
}
