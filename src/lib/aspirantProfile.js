import {
  JOB_DOMAIN_SUGGESTIONS,
  MAX_JOB_DOMAINS,
  jobDomainsFromProfile,
  normalizeJobDomainEntry,
} from './aspirantFilterOptions';

export const EMPLOYMENT_OPTIONS = [
  { value: 'working', label: 'Employed' },
  { value: 'notice', label: 'Serving notice' },
  { value: 'unemployed', label: 'Between roles' },
  { value: 'student', label: 'Student' },
];

export const WORK_MODE_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
];

export const defaultEducation = {
  tenth: { marks: '', year: '' },
  twelfth: { marks: '', year: '' },
  diploma: { branch: '', marks: '', year: '', college: '' },
  graduation: { type: '', year: '', branch: '' },
};

export const defaultProfileForm = {
  fullName: '',
  email: '',
  phone: '',
  city: '',
  country: 'India',
  isFresher: true,
  yearsExperience: '',
  employmentStatus: 'student',
  jobDomains: [],
  roleTitle: '',
  roleSpecializations: [],
  primaryRole: '',
  currentCompany: '',
  previousCompany: '',
  workMode: 'any',
  currentCtc: '',
  expectedSalaryMin: '',
  expectedSalaryMax: '',
  availableFrom: '',
  noticePeriod: 'immediate',
  willingRelocate: false,
  educationPath: 'twelfth_degree',
  intermediateType: 'twelfth',
  highestQualification: '',
  highestQualificationOther: '',
  degreeBranch: '',
  degreeBranchOther: '',
  graduationYear: '',
  isCurrentlyStudying: false,
  expectedGraduationYear: '',
  graduationScoreType: 'cgpa',
  graduationScore: '',
  collegeName: '',
  premierInstituteType: 'none',
  instituteTier: 'unrated',
  communicationLevel: 'not_assessed',
  linkedinUrl: '',
  portfolioUrl: '',
  bio: '',
  education: defaultEducation,
  skills: [],
  secondarySkills: [],
};

export function toFormEducation(edu) {
  if (!edu || typeof edu !== 'object') return { ...defaultEducation };
  return {
    tenth: {
      marks: String(edu.tenth?.marks ?? '').trim(),
      year: edu.tenth?.year ?? '',
    },
    twelfth: {
      marks: String(edu.twelfth?.marks ?? '').trim(),
      year: edu.twelfth?.year ?? '',
    },
    diploma: {
      branch: String(edu.diploma?.branch ?? '').trim(),
      marks: String(edu.diploma?.marks ?? '').trim(),
      year: edu.diploma?.year ?? '',
      college: String(edu.diploma?.college ?? '').trim(),
    },
    graduation: {
      type: String(edu.graduation?.type ?? '').trim(),
      year: edu.graduation?.year ?? '',
      branch: String(edu.graduation?.branch ?? '').trim(),
    },
  };
}

export function profileToForm(profile) {
  if (!profile) return { ...defaultProfileForm };
  const isFresher = profile.track === 'fresher' || profile.track == null;
  return {
    fullName: profile.full_name ?? '',
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    city: profile.city ?? '',
    country: profile.country ?? 'India',
    isFresher,
    yearsExperience:
      profile.experience_years != null && !isFresher ? String(profile.experience_years) : '',
    employmentStatus: profile.employment_status ?? (isFresher ? 'student' : 'working'),
    jobDomains: jobDomainsFromProfile(profile),
    roleTitle: profile.role_title ?? profile.primary_role ?? '',
    roleSpecializations: Array.isArray(profile.role_specializations)
      ? [...profile.role_specializations]
      : [],
    primaryRole: profile.primary_role ?? profile.role_title ?? '',
    currentCompany: profile.current_company ?? '',
    previousCompany: profile.previous_company ?? '',
    workMode: profile.work_mode ?? 'any',
    currentCtc: profile.current_ctc ?? '',
    expectedSalaryMin: profile.expected_salary_min ?? '',
    expectedSalaryMax: profile.expected_salary_max ?? '',
    availableFrom: profile.available_from ?? '',
    noticePeriod: profile.notice_period ?? 'immediate',
    willingRelocate: Boolean(profile.willing_relocate),
    educationPath: profile.education_path ?? 'twelfth_degree',
    intermediateType: profile.intermediate_type ?? 'twelfth',
    highestQualification: profile.highest_qualification ?? '',
    highestQualificationOther:
      profile.highest_qualification === 'other'
        ? String(profile.education?.graduation?.type ?? '').trim()
        : '',
    degreeBranch: profile.degree_branch ?? '',
    degreeBranchOther: profile.degree_branch_other ?? '',
    graduationYear:
      profile.graduation_year != null ? String(profile.graduation_year) : '',
    isCurrentlyStudying: Boolean(profile.is_currently_studying),
    expectedGraduationYear:
      profile.expected_graduation_year != null
        ? String(profile.expected_graduation_year)
        : '',
    graduationScoreType: profile.graduation_score_type ?? 'cgpa',
    graduationScore:
      profile.graduation_score != null ? String(profile.graduation_score) : '',
    collegeName: profile.college_name ?? '',
    premierInstituteType: profile.premier_institute_type ?? 'none',
    instituteTier: profile.institute_tier ?? 'unrated',
    communicationLevel: profile.communication_level ?? 'not_assessed',
    linkedinUrl: profile.linkedin_url ?? '',
    portfolioUrl: profile.portfolio_url ?? '',
    bio: profile.bio ?? '',
    education: toFormEducation(profile.education),
    skills: Array.isArray(profile.skills) ? [...profile.skills] : [],
    secondarySkills: Array.isArray(profile.secondary_skills) ? [...profile.secondary_skills] : [],
  };
}

export function normalizeHttpUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (/^(javascript|data|vbscript):/i.test(raw)) return null;
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export function isValidHttpUrl(value) {
  const candidate = normalizeHttpUrl(value);
  if (!candidate) return false;
  try {
    const u = new URL(candidate);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname;
    if (!host) return false;
    if (host !== 'localhost' && !host.includes('.')) return false;
    return true;
  } catch {
    return false;
  }
}

export function isLinkedInProfileUrl(value) {
  if (!isValidHttpUrl(value)) return false;
  const u = new URL(normalizeHttpUrl(value));
  const h = u.hostname.toLowerCase();
  return (
    h === 'linkedin.com' ||
    h === 'www.linkedin.com' ||
    h.endsWith('.linkedin.com') ||
    h === 'lnkd.in' ||
    h.endsWith('.lnkd.in')
  );
}

export function buildAspirantPayload(form, userId) {
  const isFresher = form.isFresher;
  const years = isFresher ? 0 : parseFloat(form.yearsExperience);
  const roleTitle = form.roleTitle.trim() || form.primaryRole.trim() || null;
  const gradYear = form.isCurrentlyStudying
    ? form.expectedGraduationYear
    : form.graduationYear;
  const qualCode = form.highestQualification || null;
  const qualLabel =
    form.highestQualification === 'other'
      ? form.highestQualificationOther.trim()
      : form.highestQualification;
  const branchCode = form.degreeBranch || null;
  const branchLabel =
    form.degreeBranch === 'other' ? form.degreeBranchOther.trim() : form.degreeBranch;
  const domains = (form.jobDomains ?? [])
    .map(normalizeJobDomainEntry)
    .filter(Boolean)
    .slice(0, MAX_JOB_DOMAINS);
  const firstDomain = domains[0] ?? null;
  const firstIsKnown = firstDomain && JOB_DOMAIN_SUGGESTIONS.some((o) => o.value === firstDomain);

  return {
    id: userId,
    full_name: form.fullName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim() || null,
    city: form.city.trim(),
    country: form.country.trim() || null,
    track: isFresher ? 'fresher' : 'experienced',
    experience_years: isFresher ? 0 : Number.isFinite(years) ? years : null,
    job_domains: domains,
    job_domain: firstIsKnown ? firstDomain : (firstDomain ? 'other' : null),
    job_domain_other: firstIsKnown ? null : firstDomain,
    role_title: roleTitle,
    role_specializations: form.roleSpecializations?.length ? form.roleSpecializations : [],
    primary_role: roleTitle,
    current_company: form.currentCompany.trim() || null,
    previous_company: form.previousCompany.trim() || null,
    employment_status: form.employmentStatus || null,
    work_mode: form.workMode || 'any',
    current_ctc: form.currentCtc.trim() || null,
    expected_salary_min: form.expectedSalaryMin.trim() || null,
    expected_salary_max: form.expectedSalaryMax.trim() || null,
    available_from: form.availableFrom || null,
    notice_period: form.noticePeriod || null,
    willing_relocate: Boolean(form.willingRelocate),
    education_path: form.educationPath || null,
    intermediate_type: form.intermediateType || null,
    highest_qualification: qualCode,
    degree_branch: branchCode,
    degree_branch_other:
      form.degreeBranch === 'other' ? form.degreeBranchOther.trim() || null : null,
    graduation_year: gradYear ? Number(gradYear) : null,
    is_currently_studying: Boolean(form.isCurrentlyStudying),
    expected_graduation_year: form.isCurrentlyStudying && form.expectedGraduationYear
      ? Number(form.expectedGraduationYear)
      : null,
    graduation_score_type: form.graduationScoreType || null,
    graduation_score: form.graduationScore
      ? Number(form.graduationScore)
      : null,
    college_name: form.collegeName.trim() || null,
    premier_institute_type: form.premierInstituteType || 'none',
    institute_tier: (() => {
      if (['iit', 'nit', 'iiit'].includes(form.premierInstituteType)) {
        return ['tier_1', 'tier_2', 'tier_3'].includes(form.instituteTier)
          ? form.instituteTier
          : 'tier_1';
      }
      return form.instituteTier || 'unrated';
    })(),
    communication_level: form.communicationLevel || 'not_assessed',
    linkedin_url: normalizeHttpUrl(form.linkedinUrl),
    portfolio_url: form.portfolioUrl.trim() ? normalizeHttpUrl(form.portfolioUrl) : null,
    bio: form.bio.trim() || null,
    education: {
      tenth: {
        marks: String(form.education.tenth.marks).trim(),
        year: form.education.tenth.year ? Number(form.education.tenth.year) : null,
      },
      twelfth: {
        marks: String(form.education.twelfth.marks).trim(),
        year: form.education.twelfth.year ? Number(form.education.twelfth.year) : null,
      },
      diploma: {
        branch: String(form.education.diploma?.branch ?? '').trim() || null,
        marks: String(form.education.diploma?.marks ?? '').trim() || null,
        year: form.education.diploma?.year ? Number(form.education.diploma.year) : null,
        college: String(form.education.diploma?.college ?? '').trim() || null,
      },
      graduation: {
        type: qualLabel || String(form.education.graduation.type).trim() || null,
        year: gradYear ? Number(gradYear) : null,
        branch: branchLabel || String(form.education.graduation.branch).trim() || null,
        college: form.collegeName.trim() || null,
        score_type: form.graduationScoreType || null,
        score: form.graduationScore ? Number(form.graduationScore) : null,
      },
    },
    skills: form.skills.length ? form.skills : [],
    secondary_skills: form.secondarySkills.length ? form.secondarySkills : [],
  };
}

/** Save profile: RPC first, direct upsert fallback if RPC not deployed yet. */
export async function saveAspirantProfile(supabase, payload) {
  const { data, error } = await supabase.rpc('save_my_aspirant_profile', {
    p_payload: payload,
  });

  if (!error) {
    if (!data?.ok) throw new Error(data?.error || 'Failed to save profile');
    return data.profile;
  }

  const rpcMissing =
    error.code === 'PGRST202' ||
    /could not find the function/i.test(error.message || '') ||
    (/function/i.test(error.message || '') && /does not exist/i.test(error.message || ''));

  if (!rpcMissing) {
    throw error;
  }

  const row = { ...payload };
  if (!row.id) {
    throw new Error(
      'Profile save is not set up on the server yet. Run: supabase db push --include-all',
    );
  }

  const { data: upserted, error: upsertError } = await supabase
    .from('aspirants')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (upsertError) {
    if (/schema cache/i.test(upsertError.message || '')) {
      throw new Error(
        'Database profile columns are missing. Run: supabase db push --include-all',
      );
    }
    throw upsertError;
  }

  return upserted;
}

const PLACEHOLDER_CITIES = new Set(['pending', '—', '-', 'tbd']);

export const ONBOARDING_PATH = '/onboarding?welcome=1';

/** Education step: qualification / branch "Other" must include manual text. */
export function validateJobDomains(form) {
  const domains = (form.jobDomains ?? []).map(normalizeJobDomainEntry).filter(Boolean);
  if (domains.length === 0) {
    return 'Add at least one target domain (e.g. Frontend, Backend, or your own).';
  }
  if (domains.length > MAX_JOB_DOMAINS) {
    return `You can add up to ${MAX_JOB_DOMAINS} domains.`;
  }
  return null;
}

export function validateEducationFields(form) {
  if (!form.highestQualification) return 'Select your highest qualification.';
  if (form.highestQualification === 'other') {
    if (!String(form.highestQualificationOther ?? '').trim()) {
      return 'Please specify your qualification (e.g. B.Com, BBA).';
    }
  }
  if (!form.degreeBranch) return 'Select your branch / course.';
  if (form.degreeBranch === 'other') {
    if (!String(form.degreeBranchOther ?? '').trim()) {
      return 'Please specify your branch / course (e.g. CSE, ECE, Mechanical).';
    }
  }
  return null;
}

/** True when onboarding form requirements are satisfied (resume, skills, LinkedIn, etc.). */
export function isAspirantProfileComplete(profile) {
  if (!profile) return false;

  const name = String(profile.full_name ?? '').trim();
  const city = String(profile.city ?? '').trim();
  if (!name || PLACEHOLDER_CITIES.has(city.toLowerCase())) return false;
  if (!String(profile.phone ?? '').trim()) return false;
  if (!Array.isArray(profile.job_domains) || profile.job_domains.length === 0) {
    if (!String(profile.job_domain ?? '').trim()) return false;
  }
  if (!String(profile.role_title ?? profile.primary_role ?? '').trim()) return false;
  if (!Array.isArray(profile.skills) || profile.skills.length === 0) return false;
  if (!String(profile.linkedin_url ?? '').trim()) return false;
  if (!String(profile.resume_url ?? '').trim()) return false;
  if (!String(profile.highest_qualification ?? '').trim()) return false;
  if (!String(profile.degree_branch ?? '').trim()) return false;
  if (profile.degree_branch === 'other' && !String(profile.degree_branch_other ?? '').trim()) {
    return false;
  }
  if (profile.highest_qualification === 'other') {
    const customQual = String(profile.education?.graduation?.type ?? '').trim();
    if (!customQual || customQual === 'other') return false;
  }
  if (!String(profile.college_name ?? '').trim()) return false;

  const gradYear = profile.is_currently_studying
    ? profile.expected_graduation_year
    : profile.graduation_year;
  if (gradYear == null || gradYear === '') return false;

  if (profile.graduation_score == null && !profile.is_currently_studying) return false;

  return true;
}

/** Show first-visit contact popup when name or mobile is missing (admin needs both). */
export function needsAspirantContactDetails(profile) {
  const name = String(profile?.full_name ?? '').trim();
  const phone = String(profile?.phone ?? '').trim();
  return !name || !phone;
}

/** Minimal save for contact popup — name + mobile only (no domain/onboarding validation). */
export async function saveAspirantContactDetails(supabase, { fullName, phone, userId, email }) {
  const trimmedName = fullName.trim();
  const trimmedPhone = phone.trim();
  const trimmedEmail = (email || '').trim();

  const { data, error } = await supabase.rpc('save_aspirant_contact_details', {
    p_full_name: trimmedName,
    p_phone: trimmedPhone,
    p_email: trimmedEmail || null,
  });

  if (!error) {
    if (!data?.ok) throw new Error(data?.error || 'Failed to save your details');
    return data.profile;
  }

  const rpcMissing =
    error.code === 'PGRST202' ||
    /could not find the function/i.test(error.message || '') ||
    (/function/i.test(error.message || '') && /does not exist/i.test(error.message || ''));

  if (!rpcMissing) {
    throw error;
  }

  if (!userId) {
    throw new Error('Profile save is not set up on the server yet. Run: supabase db push --include-all');
  }

  const { data: existing, error: fetchError } = await supabase
    .from('aspirants')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from('aspirants')
      .update({ full_name: trimmedName, phone: trimmedPhone })
      .eq('id', userId)
      .select()
      .single();
    if (updateError) throw updateError;
    return updated;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('aspirants')
    .insert({
      id: userId,
      full_name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      city: '—',
      education: {},
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return inserted;
}

/** Minimal save payload for contact popup — uses existing profile save RPC. */
export function buildContactDetailsPayload({ fullName, phone, userId, email, profile }) {
  const form = profile ? profileToForm(profile) : { ...defaultProfileForm, education: { ...defaultEducation } };
  form.fullName = fullName.trim();
  form.phone = phone.trim();
  form.email = (email || form.email || '').trim();
  if (!form.city.trim() || PLACEHOLDER_CITIES.has(form.city.trim().toLowerCase())) {
    form.city = '—';
  }
  return buildAspirantPayload(form, userId);
}

export const MOBILE_VALIDATION_MESSAGE = 'Enter a valid 10-digit mobile number.';

/** Strip +91 / leading 0 and return digits only. */
export function normalizeMobileDigits(phone) {
  let digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

/** Indian mobile: exactly 10 digits, starting with 6–9. */
export function isValidMobileNumber(phone) {
  const digits = normalizeMobileDigits(phone);
  return digits.length === 10 && /^[6-9]/.test(digits);
}

/** @deprecated Use isValidMobileNumber */
export const isValidContactPhone = isValidMobileNumber;
