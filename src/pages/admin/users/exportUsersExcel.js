import * as XLSX from 'xlsx';
import {
  jobDomainLabel,
  jobDomainsLabel,
  qualificationLabel,
  branchLabel,
  communicationLabel,
  noticePeriodLabel,
} from '../../../lib/aspirantFilterOptions';
import { getMockRoleFitLabel } from '../../../lib/mockFeedbackTopics';
import { getPlacementRecommendationLabel } from '../../../lib/mockFeedback';
import { buildUsersListRpcParams } from './adminUserFilters';
import { enrichUsersWithAllMockRoleFit } from './aggregateMockRoleFit';
import { formatAspirantPhone } from './AspirantIdentity';

const EXPORT_LIMIT = 100;

function userToRow(u) {
  const domains = jobDomainsLabel(u.job_domains) !== '—'
    ? jobDomainsLabel(u.job_domains)
    : jobDomainLabel(u.job_domain);
  const score = u.graduation_score != null
    ? `${u.graduation_score}${u.graduation_score_type === 'percentage' ? '%' : ''}`
    : '';
  const mockScores = u.latest_mock_overall != null
    ? `O:${u.latest_mock_overall} C:${u.latest_mock_communication ?? ''} T:${u.latest_mock_technical ?? ''}`
    : '';
  const roleFit = Array.isArray(u.all_mock_role_fit_keys) && u.all_mock_role_fit_keys.length > 0
    ? u.all_mock_role_fit_keys.map(getMockRoleFitLabel).join(', ')
    : '';

  const profileLabel = (u.profile_status ?? 'active') === 'inactive' ? 'Placed' : 'Active';
  const readinessLabel = u.latest_placement_recommendation
    ? getPlacementRecommendationLabel(u.latest_placement_recommendation)
    : '';
  const placement = (u.profile_status ?? 'active') === 'inactive' && u.placed_in
    ? `${u.placed_in}${u.placed_at ? ` (${u.placed_at})` : ''}`
    : '';

  const phone = formatAspirantPhone(u.phone);
  const nameWithPhone = [u.full_name?.trim(), phone].filter(Boolean).join(' · ');

  return {
    Name: nameWithPhone || u.full_name || '',
    Email: u.email ?? '',
    Phone: phone ?? '',
    Domains: domains,
    Role: u.role_title ?? '',
    Qualification: qualificationLabel(u.highest_qualification),
    Branch: branchLabel(u.highest_qualification, u.degree_branch, u.degree_branch_other),
    College: u.college_name ?? '',
    Batch: u.graduation_year ?? '',
    Score: score,
    Communication: communicationLabel(u.communication_level),
    'Notice period': noticePeriodLabel(u.notice_period),
    'Latest mock scores': mockScores,
    'Recommended for (all mocks)': roleFit,
    'Profile status': profileLabel,
    'Interview readiness': readinessLabel,
    Placement: placement,
    Mocks: `${u.completed_total ?? 0}/${u.mock_limit ?? 0}`,
    Plan: u.plan ?? '',
    Track: u.track ?? '',
    Subscription: u.is_active ? 'Active' : 'Expired',
  };
}

export function downloadUsersExcel(users, filename = 'aspirants-filtered.xlsx') {
  if (!users?.length) return false;

  const sheet = XLSX.utils.json_to_sheet(users.map(userToRow));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Aspirants');
  XLSX.writeFile(workbook, filename);
  return true;
}

/** Fetch up to EXPORT_LIMIT rows for current filters, then download Excel. */
export async function exportFilteredUsersExcel(supabase, filters) {
  const { data, error } = await supabase.rpc('get_admin_users_list', {
    ...buildUsersListRpcParams(filters),
    p_limit: EXPORT_LIMIT,
    p_offset: 0,
  });
  if (error) throw new Error(error.message || 'Export failed');
  const rows = Array.isArray(data) ? data : [];
  if (!rows.length) return { ok: false, reason: 'empty' };
  const enriched = await enrichUsersWithAllMockRoleFit(supabase, rows);
  downloadUsersExcel(enriched);
  return { ok: true, count: enriched.length };
}
