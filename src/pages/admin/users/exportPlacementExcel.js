import * as XLSX from 'xlsx';
import {
  qualificationLabel,
  instituteTierLabel,
} from '../../../lib/aspirantFilterOptions';
import { formatAspirantPhone } from './AspirantIdentity';
import { buildUsersListRpcParams } from './adminUserFilters';

export const PLACEMENT_EXPORT_LIMIT = 100;
/** Resume links in Excel stay valid for 30 days. */
export const PLACEMENT_RESUME_SIGNED_TTL_SEC = 30 * 24 * 60 * 60;

/** Exact header text + column order (matches placement template). */
export const PLACEMENT_HEADERS = [
  'Name',
  'Contact Number',
  'EMail ID',
  'Education (B.TECH/ MCA/MBA/MSC/DEGREE)',
  'Passedout year',
  'College name',
  'Type of college Tier 1 or Tier 2 or Tier 3',
  'Graduation marks only in %',
  'Inter marks only in %',
  '10th marks only in %',
  'Any post graduation',
  'Primary skills',
  'RESUME',
  'Ready for Placements',
];

const POST_GRAD_KEYS = new Set(['mtech', 'mca', 'mba', 'msc', 'ms', 'm.e', 'me']);

const EDUCATION_DISPLAY = {
  btech: 'B.TECH',
  be: 'B.E',
  bsc: 'B.SC',
  bca: 'BCA',
  mtech: 'M.TECH',
  mca: 'MCA',
  diploma: 'DIPLOMA',
  mba: 'MBA',
  other: 'DEGREE',
};

function asEducation(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' ? raw : {};
}

function marksOnly(value) {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  if (!s) return '';
  return s.replace(/%/g, '').trim();
}

/** Prefer a clean % number; convert CGPA (≤10) to approximate % (×9.5). */
function graduationMarksPercent(score, scoreType) {
  if (score == null || score === '') return '';
  const n = Number(score);
  if (!Number.isFinite(n)) return marksOnly(score);
  if (scoreType === 'percentage' || n > 10) {
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
  }
  // CGPA → % (common Indian conversion)
  const pct = Math.round(n * 9.5 * 10) / 10;
  return String(pct);
}

function schoolMarksPercent(value) {
  const raw = marksOnly(value);
  if (!raw) return '';
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
}

function educationLabel(u) {
  const key = String(u.highest_qualification ?? '').toLowerCase().trim();
  if (EDUCATION_DISPLAY[key]) return EDUCATION_DISPLAY[key];
  const fromQual = qualificationLabel(u.highest_qualification);
  if (fromQual && fromQual !== '—') {
    return String(fromQual).toUpperCase().replace(/\s+/g, ' ');
  }
  const edu = asEducation(u.education);
  const custom = String(edu.graduation?.type ?? '').trim();
  if (!custom) return '';
  const lower = custom.toLowerCase();
  if (EDUCATION_DISPLAY[lower]) return EDUCATION_DISPLAY[lower];
  if (/b\.?\s*tech|btech/.test(lower)) return 'B.TECH';
  if (/b\.?\s*e\b|b\.e/.test(lower)) return 'B.E';
  if (/b\.?\s*sc|bsc/.test(lower)) return 'B.SC';
  if (/m\.?\s*tech|mtech/.test(lower)) return 'M.TECH';
  if (/mca/.test(lower)) return 'MCA';
  if (/mba/.test(lower)) return 'MBA';
  if (/m\.?\s*sc|msc/.test(lower)) return 'MSC';
  if (/diploma/.test(lower)) return 'DIPLOMA';
  return custom.toUpperCase();
}

function postGraduationLabel(u) {
  const key = String(u.highest_qualification ?? '').toLowerCase();
  if (POST_GRAD_KEYS.has(key)) {
    return EDUCATION_DISPLAY[key] || qualificationLabel(u.highest_qualification) || '';
  }
  const edu = asEducation(u.education);
  const custom = String(edu.graduation?.type ?? '').trim();
  if (/(m\.?\s*tech|mca|mba|m\.?\s*sc|post\s*grad|pg)/i.test(custom)) {
    return educationLabel({ highest_qualification: null, education: { graduation: { type: custom } } });
  }
  return '';
}

function skillsLabel(skills) {
  if (Array.isArray(skills)) return skills.filter(Boolean).join(', ');
  if (typeof skills === 'string') return skills.trim();
  return '';
}

function readyForPlacements(u) {
  if ((u.profile_status ?? 'active') === 'inactive') return 'Placed';
  if ((u.placement_pipeline_status ?? 'none') === 'ready') return 'Yes';
  return 'No';
}

function tierLabel(tier) {
  const raw = String(tier ?? '').toLowerCase().trim();
  if (!raw || raw === 'unrated' || raw === 'none') return '';
  if (raw === 'tier_1' || raw === 'tier1') return 'Tier 1';
  if (raw === 'tier_2' || raw === 'tier2') return 'Tier 2';
  if (raw === 'tier_3' || raw === 'tier3') return 'Tier 3';
  const label = instituteTierLabel(tier);
  if (!label || label === '—' || /not\s*rated|unrated/i.test(label)) return '';
  return label;
}

/**
 * Normalize a user list row or job-applicant row into one placement profile shape.
 */
export function toPlacementProfile(raw, source = 'user') {
  if (source === 'applicant') {
    return {
      id: raw.aspirant_id,
      full_name: raw.aspirant_name,
      email: raw.aspirant_email,
      phone: raw.aspirant_phone,
      highest_qualification: raw.aspirant_highest_qualification,
      degree_branch: raw.aspirant_degree_branch,
      degree_branch_other: raw.aspirant_degree_branch_other,
      graduation_year: raw.aspirant_graduation_year,
      graduation_score: raw.aspirant_graduation_score,
      graduation_score_type: raw.aspirant_graduation_score_type,
      college_name: raw.aspirant_college_name,
      institute_tier: raw.aspirant_institute_tier,
      education: raw.aspirant_education,
      skills: raw.aspirant_skills,
      resume_url: raw.aspirant_resume_url,
      profile_status: raw.profile_status,
      placement_pipeline_status: raw.placement_pipeline_status,
    };
  }
  return raw;
}

/** Values in exact template column order (array, not object key order). */
export function placementProfileToValues(u, resumeSignedUrl = '') {
  const edu = asEducation(u.education);
  return [
    u.full_name?.trim() || '',
    formatAspirantPhone(u.phone) || '',
    u.email ?? '',
    educationLabel(u),
    u.graduation_year ?? '',
    u.college_name ?? '',
    tierLabel(u.institute_tier),
    graduationMarksPercent(u.graduation_score, u.graduation_score_type),
    schoolMarksPercent(edu.twelfth?.marks) || schoolMarksPercent(edu.diploma?.marks) || '',
    schoolMarksPercent(edu.tenth?.marks),
    postGraduationLabel(u),
    skillsLabel(u.skills),
    resumeSignedUrl || '',
    readyForPlacements(u),
  ];
}

export async function createResumeSignedUrls(supabase, profiles) {
  const entries = await Promise.all(
    profiles.map(async (p) => {
      const path = p.resume_url?.trim?.() || p.resume_url;
      if (!path) return [p.id, ''];
      const { data, error } = await supabase.storage
        .from('resumes')
        .createSignedUrl(path, PLACEMENT_RESUME_SIGNED_TTL_SEC);
      if (error || !data?.signedUrl) return [p.id, ''];
      return [p.id, data.signedUrl];
    }),
  );
  return Object.fromEntries(entries);
}

function applyPlacementSheetLayout(sheet, rowCount) {
  // Compact but readable column widths
  sheet['!cols'] = [
    { wch: 18 }, // Name
    { wch: 14 }, // Contact Number
    { wch: 24 }, // EMail ID
    { wch: 24 }, // Education (...)
    { wch: 10 }, // Passedout year
    { wch: 22 }, // College name
    { wch: 18 }, // Type of college Tier...
    { wch: 14 }, // Graduation marks %
    { wch: 12 }, // Inter marks %
    { wch: 12 }, // 10th marks %
    { wch: 14 }, // Any post graduation
    { wch: 26 }, // Primary skills
    { wch: 32 }, // RESUME
    { wch: 12 }, // Ready for Placements
  ];
  sheet['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: Math.max(0, rowCount), c: PLACEMENT_HEADERS.length - 1 },
    }),
  };
}

export function downloadPlacementExcel(profiles, signedById, filename) {
  if (!profiles?.length) return false;

  const aoa = [
    PLACEMENT_HEADERS,
    ...profiles.map((p) => placementProfileToValues(p, signedById[p.id] || '')),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  applyPlacementSheetLayout(sheet, profiles.length);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Placement');
  XLSX.writeFile(workbook, filename);
  return true;
}

export async function fetchPlacementFieldsByIds(supabase, ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return [];
  const { data, error } = await supabase.rpc('get_aspirant_placement_export_fields', {
    p_ids: unique,
  });
  if (error) throw new Error(error.message || 'Could not load placement fields');
  return Array.isArray(data) ? data : [];
}

/** Users page: filtered list (max 100) + placement fields + 30-day resume links. */
export async function exportFilteredUsersPlacementExcel(supabase, filters) {
  const { data, error } = await supabase.rpc('get_admin_users_list', {
    ...buildUsersListRpcParams(filters),
    p_limit: PLACEMENT_EXPORT_LIMIT,
    p_offset: 0,
  });
  if (error) throw new Error(error.message || 'Export failed');
  const list = Array.isArray(data) ? data : [];
  if (!list.length) return { ok: false, reason: 'empty' };

  const extra = await fetchPlacementFieldsByIds(
    supabase,
    list.map((u) => u.id),
  );
  const byId = Object.fromEntries(extra.map((r) => [r.id, r]));
  const profiles = list.map((u) => ({ ...u, ...byId[u.id] }));
  const signedById = await createResumeSignedUrls(supabase, profiles);
  downloadPlacementExcel(profiles, signedById, 'placement-aspirants.xlsx');
  return { ok: true, count: profiles.length };
}

/** Job applicants page: up to 100 filtered platform applicants. */
export async function exportJobApplicantsPlacementExcel(supabase, applications, jobTitle) {
  const limited = (Array.isArray(applications) ? applications : []).slice(
    0,
    PLACEMENT_EXPORT_LIMIT,
  );
  if (!limited.length) return { ok: false, reason: 'empty' };

  const profiles = limited.map((row) => toPlacementProfile(row, 'applicant'));
  const needIds = profiles
    .filter(
      (p) =>
        !p.education ||
        p.college_name == null ||
        p.highest_qualification == null ||
        p.resume_url == null,
    )
    .map((p) => p.id);

  let byId = {};
  if (needIds.length) {
    const extra = await fetchPlacementFieldsByIds(supabase, needIds);
    byId = Object.fromEntries(extra.map((r) => [r.id, r]));
  }

  const merged = profiles.map((p) => ({ ...p, ...byId[p.id] }));
  const signedById = await createResumeSignedUrls(supabase, merged);
  const safeTitle = String(jobTitle || 'job')
    .replace(/[^\w\-]+/g, '_')
    .slice(0, 40);
  downloadPlacementExcel(merged, signedById, `placement-${safeTitle}.xlsx`);
  return { ok: true, count: merged.length };
}
