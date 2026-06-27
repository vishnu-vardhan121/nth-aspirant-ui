import {
  jobDomainLabel,
  jobDomainsLabel,
  qualificationLabel,
  branchLabel,
  communicationLabel,
  noticePeriodLabel,
} from '../../../lib/aspirantFilterOptions';
import { buildUsersListRpcParams } from './adminUserFilters';

const EXPORT_LIMIT = 100;

function csvCell(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowToCells(u) {
  const domains = jobDomainsLabel(u.job_domains) !== '—'
    ? jobDomainsLabel(u.job_domains)
    : jobDomainLabel(u.job_domain);
  const score = u.graduation_score != null
    ? `${u.graduation_score}${u.graduation_score_type === 'percentage' ? '%' : ''}`
    : '';
  const mockScores = u.latest_mock_overall != null
    ? `O:${u.latest_mock_overall} C:${u.latest_mock_communication ?? ''} T:${u.latest_mock_technical ?? ''}`
    : '';

  return [
    u.full_name,
    u.email,
    u.phone,
    domains,
    u.role_title,
    qualificationLabel(u.highest_qualification),
    branchLabel(u.highest_qualification, u.degree_branch, u.degree_branch_other),
    u.college_name,
    u.graduation_year,
    score,
    communicationLabel(u.communication_level),
    noticePeriodLabel(u.notice_period),
    mockScores,
    `${u.mocks_conducted_in_period ?? 0}/${u.mock_limit ?? 0}`,
    u.plan,
    u.track,
    u.is_active ? 'Active' : 'Expired',
  ].map(csvCell);
}

const HEADERS = [
  'Name',
  'Email',
  'Phone',
  'Domains',
  'Role',
  'Qualification',
  'Branch',
  'College',
  'Batch',
  'Score',
  'Communication',
  'Notice period',
  'Latest mock scores',
  'Mocks (period)',
  'Plan',
  'Track',
  'Status',
];

export function downloadUsersCsv(users, filename = 'aspirants-filtered.csv') {
  if (!users?.length) return false;
  const lines = [
    HEADERS.map(csvCell).join(','),
    ...users.map((u) => rowToCells(u).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

/** Fetch up to EXPORT_LIMIT rows for current filters, then download CSV. */
export async function exportFilteredUsersCsv(supabase, filters) {
  const { data, error } = await supabase.rpc('get_admin_users_list', {
    ...buildUsersListRpcParams(filters),
    p_limit: EXPORT_LIMIT,
    p_offset: 0,
  });
  if (error) throw new Error(error.message || 'Export failed');
  const rows = Array.isArray(data) ? data : [];
  if (!rows.length) return { ok: false, reason: 'empty' };
  downloadUsersCsv(rows);
  return { ok: true, count: rows.length };
}
