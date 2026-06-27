export const MAX_JOB_DOMAINS = 5;

/** Common domain suggestions — users can also add their own (up to MAX_JOB_DOMAINS). */
export const JOB_DOMAIN_SUGGESTIONS = [
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
  { value: 'fullstack', label: 'Full Stack' },
  { value: 'software', label: 'Software / SDE' },
  { value: 'devops', label: 'DevOps' },
  { value: 'qa', label: 'QA / Testing' },
  { value: 'data', label: 'Data / Analytics' },
  { value: 'mobile', label: 'Mobile' },
];

/** @deprecated Use JOB_DOMAIN_SUGGESTIONS — kept for admin filter dropdown. */
export const JOB_DOMAIN_OPTIONS = JOB_DOMAIN_SUGGESTIONS;

export const NOTICE_PERIOD_OPTIONS = [
  { value: 'immediate', label: 'Immediate joiner' },
  { value: 'days_15_30', label: '15–30 days' },
  { value: 'days_30_60', label: '30–60 days' },
  { value: 'days_60_90', label: '60–90 days' },
];

export const QUALIFICATION_OPTIONS = [
  { value: 'btech', label: 'B.Tech' },
  { value: 'be', label: 'B.E' },
  { value: 'bsc', label: 'B.Sc' },
  { value: 'bca', label: 'BCA' },
  { value: 'mtech', label: 'M.Tech' },
  { value: 'mca', label: 'MCA' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'mba', label: 'MBA' },
  { value: 'other', label: 'Other' },
];

export const EDUCATION_PATH_OPTIONS = [
  { value: 'twelfth_degree', label: '10th → 12th → Degree' },
  { value: 'diploma_degree', label: '10th → Diploma → Degree' },
  { value: 'diploma_only', label: 'Diploma only' },
  { value: 'degree_only', label: 'Degree only (skip school details)' },
  { value: 'other', label: 'Other' },
];

export const INTERMEDIATE_TYPE_OPTIONS = [
  { value: 'twelfth', label: '12th / Intermediate' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'na', label: 'Not applicable' },
];

export const PREMIER_INSTITUTE_OPTIONS = [
  { value: 'none', label: 'None / Other college' },
  { value: 'iit', label: 'IIT' },
  { value: 'nit', label: 'NIT' },
  { value: 'iiit', label: 'IIIT' },
];

export const INSTITUTE_TIER_OPTIONS = [
  { value: 'unrated', label: 'Not rated' },
  { value: 'tier_1', label: 'Tier 1' },
  { value: 'tier_2', label: 'Tier 2' },
  { value: 'tier_3', label: 'Tier 3' },
];

/** Tiers shown when user selects IIT / NIT / IIIT. */
export const INSTITUTE_TIER_SELECT_OPTIONS = INSTITUTE_TIER_OPTIONS.filter(
  (o) => o.value !== 'unrated',
);

export const PREMIER_INSTITUTE_TYPES = new Set(['iit', 'nit', 'iiit']);

/** Onboarding / profile: one dropdown — Tier 1–3 or IIT / NIT / IIIT. */
export const COLLEGE_STANDING_OPTIONS = [
  { value: 'tier_1', label: 'Tier 1' },
  { value: 'tier_2', label: 'Tier 2' },
  { value: 'tier_3', label: 'Tier 3' },
  { value: 'iit', label: 'IIT' },
  { value: 'nit', label: 'NIT' },
  { value: 'iiit', label: 'IIIT' },
];

export function isPremierInstituteSelection(value) {
  return PREMIER_INSTITUTE_TYPES.has(value);
}

export function formatCollegeStandingOption(premierInstituteType, instituteTier) {
  if (isPremierInstituteSelection(premierInstituteType)) return premierInstituteType;
  if (['tier_1', 'tier_2', 'tier_3'].includes(instituteTier)) return instituteTier;
  return '';
}

export function parseCollegeStandingOption(value) {
  if (!value) return { premierInstituteType: 'none', instituteTier: 'unrated' };
  if (isPremierInstituteSelection(value)) {
    return { premierInstituteType: value, instituteTier: 'unrated' };
  }
  if (['tier_1', 'tier_2', 'tier_3'].includes(value)) {
    return { premierInstituteType: 'none', instituteTier: value };
  }
  return { premierInstituteType: 'none', instituteTier: 'unrated' };
}

export function collegeStandingLabel(premierInstituteType, instituteTier) {
  const key = formatCollegeStandingOption(premierInstituteType, instituteTier);
  return COLLEGE_STANDING_OPTIONS.find((o) => o.value === key)?.label ?? '—';
}

export const COMMUNICATION_LEVEL_OPTIONS = [
  { value: 'not_assessed', label: 'Not assessed' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'average', label: 'Average' },
  { value: 'needs_improvement', label: 'Needs improvement' },
];

export const GRADUATION_SCORE_TYPE_OPTIONS = [
  { value: 'cgpa', label: 'CGPA' },
  { value: 'percentage', label: 'Percentage' },
];

export const ROLE_SPECIALIZATION_SUGGESTIONS = [
  'React', 'Angular', 'Vue', 'JavaScript', 'TypeScript', 'HTML/CSS',
  'Java', 'Spring Boot', 'Python', 'Django', 'Node.js', 'Express',
  '.NET', 'C#', 'Go', 'Rust', 'SQL', 'PostgreSQL', 'MongoDB',
  'AWS', 'Docker', 'Kubernetes', 'DevOps', 'Selenium', 'Manual Testing',
];

/** Branch options keyed by qualification code. */
export const BRANCHES_BY_QUALIFICATION = {
  btech: [
    { value: 'cse', label: 'CSE' },
    { value: 'it', label: 'IT' },
    { value: 'ece', label: 'ECE' },
    { value: 'eee', label: 'EEE' },
    { value: 'mechanical', label: 'Mechanical' },
    { value: 'civil', label: 'Civil' },
    { value: 'aiml', label: 'AI / ML' },
    { value: 'data_science', label: 'Data Science' },
    { value: 'cyber_security', label: 'Cyber Security' },
    { value: 'other', label: 'Other' },
  ],
  be: [
    { value: 'cse', label: 'CSE' },
    { value: 'it', label: 'IT' },
    { value: 'ece', label: 'ECE' },
    { value: 'eee', label: 'EEE' },
    { value: 'mechanical', label: 'Mechanical' },
    { value: 'civil', label: 'Civil' },
    { value: 'other', label: 'Other' },
  ],
  bsc: [
    { value: 'computer_science', label: 'Computer Science' },
    { value: 'mathematics', label: 'Mathematics' },
    { value: 'physics', label: 'Physics' },
    { value: 'chemistry', label: 'Chemistry' },
    { value: 'statistics', label: 'Statistics' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'other', label: 'Other' },
  ],
  bca: [{ value: 'bca', label: 'BCA' }, { value: 'other', label: 'Other' }],
  mtech: [
    { value: 'cse', label: 'CSE' },
    { value: 'data_science', label: 'Data Science' },
    { value: 'vlsi', label: 'VLSI' },
    { value: 'power_systems', label: 'Power Systems' },
    { value: 'structural', label: 'Structural' },
    { value: 'other', label: 'Other' },
  ],
  mca: [{ value: 'mca', label: 'MCA' }, { value: 'other', label: 'Other' }],
  diploma: [
    { value: 'cse', label: 'CSE' },
    { value: 'mechanical', label: 'Mechanical' },
    { value: 'civil', label: 'Civil' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'ece', label: 'ECE' },
    { value: 'other', label: 'Other' },
  ],
  mba: [
    { value: 'finance', label: 'Finance' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'hr', label: 'HR' },
    { value: 'operations', label: 'Operations' },
    { value: 'other', label: 'Other' },
  ],
  other: [{ value: 'other', label: 'Other' }],
};

export function getBranchOptions(qualification) {
  if (!qualification) return [];
  return BRANCHES_BY_QUALIFICATION[qualification] ?? BRANCHES_BY_QUALIFICATION.other;
}

export function labelForOption(options, value) {
  if (!value) return '—';
  const found = options.find((o) => o.value === value);
  return found?.label ?? value;
}

export function normalizeJobDomainEntry(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  const byValue = JOB_DOMAIN_SUGGESTIONS.find((o) => o.value.toLowerCase() === lower);
  if (byValue) return byValue.value;
  const byLabel = JOB_DOMAIN_SUGGESTIONS.find((o) => o.label.toLowerCase() === lower);
  if (byLabel) return byLabel.value;
  return trimmed;
}

export function jobDomainLabel(value) {
  if (!value) return '—';
  if (value === 'other') return 'Other';
  return labelForOption(JOB_DOMAIN_SUGGESTIONS, value) || value;
}

export function jobDomainsLabel(domains) {
  if (!Array.isArray(domains) || domains.length === 0) return '—';
  return domains.map((d) => jobDomainLabel(d)).join(', ');
}

export function jobDomainsFromProfile(profile) {
  if (Array.isArray(profile?.job_domains) && profile.job_domains.length > 0) {
    return [...profile.job_domains];
  }
  if (!profile?.job_domain) return [];
  if (profile.job_domain === 'other' && profile.job_domain_other) {
    return [profile.job_domain_other];
  }
  return [profile.job_domain];
}

export function qualificationLabel(value) {
  return labelForOption(QUALIFICATION_OPTIONS, value);
}

export function branchLabel(qualification, branch, branchOther) {
  if (!branch) return '—';
  if (branch === 'other') {
    const custom = String(branchOther ?? '').trim();
    return custom || 'Other (not specified)';
  }
  const opts = getBranchOptions(qualification);
  return labelForOption(opts, branch);
}

export function communicationLabel(value) {
  return labelForOption(COMMUNICATION_LEVEL_OPTIONS, value);
}

export function noticePeriodLabel(value) {
  return labelForOption(NOTICE_PERIOD_OPTIONS, value);
}

export function premierInstituteLabel(value) {
  return labelForOption(PREMIER_INSTITUTE_OPTIONS, value);
}

export function instituteTierLabel(value) {
  return labelForOption(INSTITUTE_TIER_OPTIONS, value);
}

/** Default role title from domain for display/search. */
export function defaultRoleTitleForDomain(domain) {
  const map = {
    frontend: 'Frontend Developer',
    backend: 'Backend Developer',
    fullstack: 'Full Stack Developer',
    software: 'Software Developer',
    devops: 'DevOps Engineer',
    qa: 'QA Engineer',
    data: 'Data Analyst',
    mobile: 'Mobile Developer',
  };
  return map[domain] ?? '';
}
