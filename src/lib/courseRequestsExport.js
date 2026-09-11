import { adminListCourseGoldenHistory, formatCourseDate } from './courses';
import { branchLabel, qualificationLabel } from './aspirantFilterOptions';

const JOIN_STATUSES = ['requested', 'free', 'rejected'];
const GOLDEN_STATUSES = ['golden_requested', 'golden', 'golden_rejected'];

export function prettyStatus(value) {
  return String(value || '—')
    .split('_')
    .join(' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function baseRow(m) {
  return {
    Name: m.aspirant_name || '',
    Email: m.aspirant_email || '',
    Phone: m.aspirant_phone || '',
    Qualification: qualificationLabel(m.highest_qualification),
    Branch: branchLabel(m.highest_qualification, m.degree_branch, m.degree_branch_other),
    College: m.college_name || '',
    'Graduation year': m.graduation_year || '',
    Status: prettyStatus(m.status),
  };
}

function joinRequestRow(m) {
  return {
    ...baseRow(m),
    'Join reason': m.reason || '',
    'Requested at': m.created_at ? formatCourseDate(m.created_at) : '',
    'Reviewed at': m.reviewed_at ? formatCourseDate(m.reviewed_at) : '',
    'Joined at': m.joined_at ? formatCourseDate(m.joined_at) : '',
  };
}

function goldenRequestRow(m) {
  return {
    ...baseRow(m),
    'Access state': prettyStatus(m.access_state),
    'Golden request reason': m.golden_request_reason || '',
    'Golden requested at': m.golden_requested_at ? formatCourseDate(m.golden_requested_at) : '',
    'Partial approved by': m.golden_partial_approved_by_name || '',
    'Partial approval reason': m.golden_partial_reason || '',
    'Partial approved at': m.golden_partial_approved_at
      ? formatCourseDate(m.golden_partial_approved_at)
      : '',
    'Final review reason': m.golden_review_reason || '',
    'Reviewed at': m.golden_reviewed_at ? formatCourseDate(m.golden_reviewed_at) : '',
    Pack: m.chosen_pack || '',
    Installments: m.installments_total ? `${m.installments_paid || 0}/${m.installments_total}` : '',
  };
}

async function downloadRows(rows, sheetName, filename) {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

/** Free-join requests only (requested / free / rejected) — separate from Golden Batch. */
export async function downloadCourseJoinRequestsExcel(courseId) {
  const res = await adminListCourseGoldenHistory(courseId);
  if (!res.ok) return { ok: false, error: res.error || 'Failed to load data for download' };
  const rows = (res.members || []).filter((m) => JOIN_STATUSES.includes(m.status));
  if (!rows.length) return { ok: false, error: 'No join requests to download yet.' };
  await downloadRows(rows.map(joinRequestRow), 'Join requests', `join-requests-${courseId}.xlsx`);
  return { ok: true };
}

/** Golden Batch requests only (golden_requested / golden / golden_rejected). */
export async function downloadCourseGoldenRequestsExcel(courseId) {
  const res = await adminListCourseGoldenHistory(courseId);
  if (!res.ok) return { ok: false, error: res.error || 'Failed to load data for download' };
  const rows = (res.members || []).filter((m) => GOLDEN_STATUSES.includes(m.status));
  if (!rows.length) return { ok: false, error: 'No Golden requests to download yet.' };
  await downloadRows(rows.map(goldenRequestRow), 'Golden requests', `golden-requests-${courseId}.xlsx`);
  return { ok: true };
}
