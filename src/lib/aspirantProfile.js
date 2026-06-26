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
  primaryRole: '',
  currentCompany: '',
  previousCompany: '',
  workMode: 'any',
  currentCtc: '',
  expectedSalaryMin: '',
  expectedSalaryMax: '',
  availableFrom: '',
  willingRelocate: false,
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
    primaryRole: profile.primary_role ?? '',
    currentCompany: profile.current_company ?? '',
    previousCompany: profile.previous_company ?? '',
    workMode: profile.work_mode ?? 'any',
    currentCtc: profile.current_ctc ?? '',
    expectedSalaryMin: profile.expected_salary_min ?? '',
    expectedSalaryMax: profile.expected_salary_max ?? '',
    availableFrom: profile.available_from ?? '',
    willingRelocate: Boolean(profile.willing_relocate),
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
  return {
    id: userId,
    full_name: form.fullName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim() || null,
    city: form.city.trim(),
    country: form.country.trim() || null,
    track: isFresher ? 'fresher' : 'experienced',
    experience_years: isFresher ? 0 : Number.isFinite(years) ? years : null,
    primary_role: form.primaryRole.trim() || null,
    current_company: form.currentCompany.trim() || null,
    previous_company: form.previousCompany.trim() || null,
    employment_status: form.employmentStatus || null,
    work_mode: form.workMode || 'any',
    current_ctc: form.currentCtc.trim() || null,
    expected_salary_min: form.expectedSalaryMin.trim() || null,
    expected_salary_max: form.expectedSalaryMax.trim() || null,
    available_from: form.availableFrom || null,
    willing_relocate: Boolean(form.willingRelocate),
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
      graduation: {
        type: String(form.education.graduation.type).trim() || null,
        year: form.education.graduation.year ? Number(form.education.graduation.year) : null,
        branch: String(form.education.graduation.branch).trim() || null,
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

/** True when onboarding form requirements are satisfied (resume, skills, LinkedIn, etc.). */
export function isAspirantProfileComplete(profile) {
  if (!profile) return false;

  const name = String(profile.full_name ?? '').trim();
  const city = String(profile.city ?? '').trim();
  if (!name || PLACEHOLDER_CITIES.has(city.toLowerCase())) return false;
  if (!String(profile.phone ?? '').trim()) return false;
  if (!String(profile.primary_role ?? '').trim()) return false;
  if (!Array.isArray(profile.skills) || profile.skills.length === 0) return false;
  if (!String(profile.linkedin_url ?? '').trim()) return false;
  if (!String(profile.resume_url ?? '').trim()) return false;

  const grad = profile.education?.graduation;
  if (!String(grad?.type ?? '').trim() || grad?.year == null || grad?.year === '') return false;

  return true;
}

/** Show first-visit contact popup when name or mobile is missing (admin needs both). */
export function needsAspirantContactDetails(profile) {
  const name = String(profile?.full_name ?? '').trim();
  const phone = String(profile?.phone ?? '').trim();
  return !name || !phone;
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
