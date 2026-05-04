import { useState } from 'react';

/** Stable scroll targets for client validation (see TalentPoolForm markup ids). */
const FIELD_SCROLL_ID = {
  fullName: 'tp-name',
  email: 'tp-email',
  phone: 'tp-phone',
  primarySkills: 'tp-primary-skills',
  linkedinUrl: 'tp-li',
  portfolioUrl: 'tp-portfolio',
  resume: 'tp-resume-upload',
  consent: 'tp-consent',
  salaryRange: 'tp-salary-range',
  communication: 'tp-comm',
};

const CLIENT_VALIDATION_ORDER = [
  'fullName',
  'email',
  'phone',
  'primarySkills',
  'linkedinUrl',
  'portfolioUrl',
  'yearsExperience',
  'resume',
  'consent',
  'salaryRange',
  'communication',
];

function scrollIdForField(field, isFresher) {
  if (field === 'yearsExperience') return isFresher ? 'tp-fresher' : 'tp-years';
  return FIELD_SCROLL_ID[field];
}

function scrollFirstFieldError(fieldErrors, isFresher) {
  const first = CLIENT_VALIDATION_ORDER.find((k) => fieldErrors[k]);
  if (!first) return;
  const sid = scrollIdForField(first, isFresher);
  requestAnimationFrame(() => {
    const el = document.getElementById(sid);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const focusable = el.matches('input,select,textarea,button,[href]')
      ? el
      : el.querySelector('input,select,textarea,button');
    if (focusable instanceof HTMLElement) {
      window.setTimeout(() => {
        try {
          focusable.focus({ preventScroll: true });
        } catch {
          focusable.focus();
        }
      }, 400);
    }
  });
}

function scrollAsyncErrorIntoView() {
  window.setTimeout(() => {
    document.getElementById('tp-async-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 0);
}

function errRing(on) {
  return on ? ' border-red-400 ring-2 ring-red-100 focus:border-red-500 focus:ring-red-200/80' : '';
}

function InlineFieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm font-medium text-red-600 leading-snug" role="alert">
      {message}
    </p>
  );
}
import { Link } from 'react-router-dom';
import {
  HiUser,
  HiEnvelope,
  HiPhone,
  HiMapPin,
  HiDocumentArrowUp,
  HiCheckCircle,
  HiGlobeAlt,
  HiBriefcase,
  HiXMark,
  HiExclamationCircle,
} from 'react-icons/hi2';
import { supabase } from '../../../../lib/supabase';

const RESUME_ACCEPT = '.pdf,.doc,.docx';
const RESUME_MAX_SIZE_MB = 5;

function hasDangerousScheme(raw) {
  return /^(javascript|data|vbscript):/i.test(String(raw).trim());
}

/** Trim and add https:// if missing so URL() parses reliably */
function normalizeHttpUrl(value) {
  const raw = String(value).trim();
  if (!raw) return null;
  if (hasDangerousScheme(raw)) return null;
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

/** http(s) only, real hostname (TLD or localhost) */
function isValidHttpUrl(value) {
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

/** LinkedIn profile / company / short link (lnkd.in) on official hosts */
function isLinkedInProfileUrl(value) {
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

/** text-base prevents iOS zoom on focus; min-h-12 ≈ 48px touch target */
/** Use ps/pe (not px) so icon inputs can raise padding-inline-start without px overriding pl. */
export const inputClass =
  'w-full min-h-12 min-w-0 ps-3.5 pe-3.5 sm:ps-4 sm:pe-4 py-3 text-base rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 shadow-sm ' +
  'focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/12 outline-none transition-[border-color,box-shadow] duration-200 disabled:bg-slate-50 disabled:text-slate-500 touch-manipulation';

const EMPLOYMENT = [
  { value: 'working', label: 'Employed' },
  { value: 'notice', label: 'Serving notice' },
  { value: 'unemployed', label: 'Between roles' },
  { value: 'student', label: 'Student' },
];

const WORK_MODES = [
  { value: 'any', label: 'Any' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
];

const sectionHeadingClass =
  'col-span-full flex min-w-0 items-center gap-2.5 border-b border-slate-200 pb-3 mb-1 text-xs font-bold uppercase tracking-[0.12em] text-indigo-600';

/**
 * @param {{ source?: string; variant?: 'default' | 'page' }} props
 */
export default function TalentPoolForm({ source = 'early_access_page', variant = 'default' }) {
  const isPage = variant === 'page';
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [willingRelocate, setWillingRelocate] = useState(false);
  const [isFresher, setIsFresher] = useState(false);
  const [yearsExperience, setYearsExperience] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('working');
  const [primarySkills, setPrimarySkills] = useState([]);
  const [secondarySkills, setSecondarySkills] = useState([]);
  const [primarySkillInput, setPrimarySkillInput] = useState('');
  const [secondarySkillInput, setSecondarySkillInput] = useState('');
  const [primaryRole, setPrimaryRole] = useState('');
  const [workMode, setWorkMode] = useState('any');
  const [currentSalary, setCurrentSalary] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [communicationLevel, setCommunicationLevel] = useState(7);
  const [resumeFile, setResumeFile] = useState(null);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  /** @type {Record<string, string>} */
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(false);

  const clearFieldError = (key) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const addSkill = (raw, list, setList, setInput) => {
    const s = raw.trim();
    if (!s || list.includes(s)) return;
    setList([...list, s]);
    setInput('');
  };

  const removeSkill = (skill, list, setList) => {
    setList(list.filter((x) => x !== skill));
  };

  const parseOptionalNumber = (v) => {
    const t = String(v).trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const fe = {};
    if (!fullName.trim()) fe.fullName = 'Full name is required.';
    if (!email.trim()) fe.email = 'Email is required.';
    else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) fe.email = 'Please enter a valid email address.';
    }

    const digits = phone.replace(/\D/g, '');
    if (!phone.trim()) fe.phone = 'Mobile number is required.';
    else if (digits.length !== 10) fe.phone = 'Enter a valid 10-digit mobile number.';

    if (primarySkills.length < 1) fe.primarySkills = 'Add at least one primary skill (type a skill and tap Add).';

    const li = linkedinUrl.trim();
    const pf = portfolioUrl.trim();
    if (!li) fe.linkedinUrl = 'LinkedIn URL is required.';
    if (!pf) fe.portfolioUrl = 'Portfolio or GitHub URL is required.';
    if (hasDangerousScheme(li)) fe.linkedinUrl = 'Use a normal https link (not javascript: or data: URLs).';
    if (hasDangerousScheme(pf)) fe.portfolioUrl = 'Use a normal https link (not javascript: or data: URLs).';
    if (li && !hasDangerousScheme(li) && !isLinkedInProfileUrl(li)) {
      fe.linkedinUrl = 'Use a LinkedIn profile link (e.g. https://www.linkedin.com/in/your-profile).';
    }
    if (pf && !hasDangerousScheme(pf) && !isValidHttpUrl(pf)) {
      fe.portfolioUrl = 'Enter a valid URL (e.g. https://github.com/yourname).';
    }

    if (!isFresher) {
      const y = parseOptionalNumber(yearsExperience);
      if (y === null || y < 0) {
        fe.yearsExperience = 'Enter years of experience, or check "I\'m a fresher" above.';
      }
    }

    if (!resumeFile) fe.resume = 'Please upload your resume (PDF, DOC, or DOCX).';
    else {
      const ext = resumeFile.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'doc', 'docx'].includes(ext)) fe.resume = 'Resume must be a PDF, DOC, or DOCX file.';
      else if (resumeFile.size > RESUME_MAX_SIZE_MB * 1024 * 1024) {
        fe.resume = `Resume must be under ${RESUME_MAX_SIZE_MB} MB.`;
      }
    }

    if (!consent) fe.consent = 'Please agree to be contacted about relevant opportunities to continue.';

    const sminCheck = parseOptionalNumber(salaryMin);
    const smaxCheck = parseOptionalNumber(salaryMax);
    if (sminCheck !== null && smaxCheck !== null && sminCheck > smaxCheck) {
      fe.salaryRange = 'Expected "from" amount cannot be greater than "up to".';
    }

    const comm = Number(communicationLevel);
    if (!Number.isInteger(comm) || comm < 1 || comm > 10) {
      fe.communication = 'Communication level must be between 1 and 10.';
    }

    if (Object.keys(fe).length > 0) {
      setFieldErrors(fe);
      scrollFirstFieldError(fe, isFresher);
      return;
    }

    setSubmitting(true);

    let resumePath = null;
    try {
      const storagePath = `talent-pool/${crypto.randomUUID()}_${resumeFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('resumes').upload(storagePath, resumeFile, { upsert: false });
      if (uploadError) {
        const resumeMsg = uploadError.message || 'Failed to upload resume.';
        setFieldErrors({ resume: resumeMsg });
        setFormError(null);
        setSubmitting(false);
        scrollFirstFieldError({ resume: resumeMsg }, isFresher);
        return;
      }
      resumePath = storagePath;
    } catch (err) {
      const resumeMsg = err?.message || 'Failed to upload resume.';
      setFieldErrors({ resume: resumeMsg });
      setFormError(null);
      setSubmitting(false);
      scrollFirstFieldError({ resume: resumeMsg }, isFresher);
      return;
    }

    const yearsVal = parseOptionalNumber(yearsExperience);
    const smin = parseOptionalNumber(salaryMin);
    const smax = parseOptionalNumber(salaryMax);
    const currentAnnual = parseOptionalNumber(currentSalary);

    const { data, error: rpcError } = await supabase.rpc('submit_talent_pool_candidate', {
      p_full_name: fullName.trim(),
      p_email: email.trim(),
      p_phone: digits,
      p_city: city.trim() || null,
      p_country: country.trim() || null,
      p_willing_to_relocate: willingRelocate,
      p_years_experience: isFresher ? (yearsVal ?? 0) : yearsVal,
      p_is_fresher: isFresher,
      p_employment_status: employmentStatus,
      p_primary_skills: primarySkills,
      p_secondary_skills: secondarySkills.length ? secondarySkills : null,
      p_primary_role: primaryRole.trim() || null,
      p_work_mode: workMode,
      p_expected_salary_min: smin,
      p_expected_salary_max: smax,
      p_current_salary_annual: currentAnnual,
      p_available_from: availableFrom || null,
      p_linkedin_url: normalizeHttpUrl(linkedinUrl),
      p_portfolio_url: normalizeHttpUrl(portfolioUrl),
      p_resume_url: resumePath,
      p_communication_level: comm,
      p_consent_given: true,
      p_consent_policy_version: 'v1',
      p_source: source,
    });

    setSubmitting(false);

    if (rpcError) {
      setFieldErrors({});
      setFormError(rpcError.message || 'Something went wrong. Please try again.');
      scrollAsyncErrorIntoView();
      return;
    }

    const result = data;
    if (result && typeof result === 'object' && result.ok === false) {
      setFieldErrors({});
      setFormError(result.error || 'Submission failed.');
      scrollAsyncErrorIntoView();
      return;
    }

    setSuccess(true);
  };

  if (success) {
    const successInner = (
      <>
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400 to-teal-600 text-white">
          <HiCheckCircle className="h-9 w-9" aria-hidden />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">You&apos;re on our verified shortlist</h2>
        <p className="mt-3 text-slate-600 leading-relaxed">
          We&apos;ll reach out when a company needs someone with your profile. You can browse open roles anytime.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <Link
            to="/jobs"
            className="nth-btn-primary inline-flex min-h-12 w-full sm:w-auto items-center justify-center rounded-2xl px-6 py-3.5 text-base sm:text-sm font-bold cursor-pointer transition-colors duration-200"
          >
            View open roles
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center rounded-2xl px-6 py-3.5 text-base sm:text-sm font-bold text-slate-700 ring-1 ring-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors duration-200"
          >
            Back to home
          </Link>
        </div>
      </>
    );

    if (isPage) {
      return (
        <div className="mx-auto max-w-full min-w-0 overflow-hidden rounded-2xl border border-emerald-200/70 bg-linear-to-b from-emerald-50/60 via-white to-white text-center shadow-xl shadow-emerald-900/10 ring-1 ring-emerald-100/60 sm:max-w-xl sm:rounded-3xl motion-reduce:transition-none">
          <div className="p-8 sm:p-10">{successInner}</div>
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-emerald-100 bg-white p-8 sm:p-10 shadow-lg shadow-emerald-900/5 text-center max-w-xl mx-auto motion-reduce:transition-none">
        {successInner}
      </div>
    );
  }

  const formCardClass = isPage
    ? 'min-w-0 space-y-7 touch-manipulation px-5 py-7 sm:space-y-8 sm:px-8 sm:py-9 lg:px-10 lg:py-10'
    : 'rounded-3xl border border-slate-200 bg-white min-w-0 p-4 sm:p-6 md:p-8 shadow-xl shadow-slate-900/5 space-y-6 sm:space-y-8 touch-manipulation';

  const formBody = (
    <>
      <form onSubmit={handleSubmit} id="early-access-form" className={formCardClass}>
        <div className="grid min-w-0 grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5 sm:gap-x-6 sm:gap-y-6">
          <div className={`${sectionHeadingClass}`}>
            <HiUser className="h-4 w-4 shrink-0" aria-hidden />
            Contact
          </div>
          <div className="min-w-0 space-y-2">
            <label htmlFor="tp-name" className="text-sm font-bold text-slate-800">
              Full name *
            </label>
            <input
              id="tp-name"
              className={`${inputClass}${errRing(!!fieldErrors.fullName)}`}
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                clearFieldError('fullName');
              }}
              autoComplete="name"
              required
              aria-invalid={fieldErrors.fullName ? true : undefined}
              aria-describedby={fieldErrors.fullName ? 'tp-name-error' : undefined}
            />
            <InlineFieldError id="tp-name-error" message={fieldErrors.fullName} />
          </div>
          <div className="min-w-0 space-y-2">
            <label htmlFor="tp-email" className="text-sm font-bold text-slate-800">
              Email *
            </label>
            <div className="relative">
              <HiEnvelope className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                id="tp-email"
                type="email"
                className={`${inputClass} !ps-12 sm:!ps-[3.25rem]${errRing(!!fieldErrors.email)}`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError('email');
                }}
                autoComplete="email"
                required
                aria-invalid={fieldErrors.email ? true : undefined}
                aria-describedby={fieldErrors.email ? 'tp-email-error' : undefined}
              />
            </div>
            <InlineFieldError id="tp-email-error" message={fieldErrors.email} />
          </div>
          <div className="min-w-0 space-y-2">
            <label htmlFor="tp-phone" className="text-sm font-bold text-slate-800">
              Mobile *
            </label>
            <div className="relative">
              <HiPhone className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                id="tp-phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                className={`${inputClass} !ps-12 sm:!ps-[3.25rem]${errRing(!!fieldErrors.phone)}`}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                  clearFieldError('phone');
                }}
                autoComplete="tel"
                required
                aria-invalid={fieldErrors.phone ? true : undefined}
                aria-describedby={fieldErrors.phone ? 'tp-phone-error' : undefined}
              />
            </div>
            <InlineFieldError id="tp-phone-error" message={fieldErrors.phone} />
          </div>
          <div className="min-w-0 space-y-2">
            <label htmlFor="tp-city" className="text-sm font-bold text-slate-800">
              City
            </label>
            <div className="relative">
              <HiMapPin className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                id="tp-city"
                className={`${inputClass} !ps-12 sm:!ps-[3.25rem]`}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Hyderabad"
              />
            </div>
          </div>
          <div className="min-w-0 space-y-2">
            <label htmlFor="tp-country" className="text-sm font-bold text-slate-800">
              Country
            </label>
            <input
              id="tp-country"
              className={inputClass}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="India"
            />
          </div>
          <div className="col-span-full min-w-0 rounded-xl border border-slate-200/80 bg-slate-50/90 p-3 sm:p-4">
            <label className="flex cursor-pointer items-start gap-3 sm:items-center">
              <input
                type="checkbox"
                checked={willingRelocate}
                onChange={(e) => setWillingRelocate(e.target.checked)}
                className="mt-0.5 sm:mt-0 h-5 w-5 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="min-w-0 text-sm font-medium text-slate-700 leading-snug">
                Open to relocating for the right role
              </span>
            </label>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-5 border-t border-slate-100 pt-6 sm:gap-x-6 sm:gap-y-6 md:grid-cols-2">
          <div className={`${sectionHeadingClass}`}>
            <HiBriefcase className="h-4 w-4 shrink-0" aria-hidden />
            Role &amp; experience
          </div>
          <label
            id="tp-fresher"
            className="col-span-full flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 sm:items-center sm:p-4 md:col-span-2"
          >
            <input
              type="checkbox"
              checked={isFresher}
              onChange={(e) => {
                setIsFresher(e.target.checked);
                if (e.target.checked) setYearsExperience('');
                clearFieldError('yearsExperience');
              }}
              className="mt-0.5 sm:mt-0 h-5 w-5 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="min-w-0 text-sm font-medium text-slate-700 leading-snug">I&apos;m a fresher (0–1 yr)</span>
          </label>
          {!isFresher ? (
            <div className="min-w-0 space-y-2">
              <label htmlFor="tp-years" className="text-sm font-bold text-slate-800">
                Years of experience *
              </label>
              <input
                id="tp-years"
                type="number"
                min={0}
                step={0.25}
                className={`${inputClass}${errRing(!!fieldErrors.yearsExperience)}`}
                value={yearsExperience}
                onChange={(e) => {
                  setYearsExperience(e.target.value);
                  clearFieldError('yearsExperience');
                }}
                placeholder="e.g. 3.5"
                aria-invalid={fieldErrors.yearsExperience ? true : undefined}
                aria-describedby={fieldErrors.yearsExperience ? 'tp-years-error' : undefined}
              />
              <InlineFieldError id="tp-years-error" message={fieldErrors.yearsExperience} />
            </div>
          ) : null}
          <div className="min-w-0 space-y-2">
            <label htmlFor="tp-employment" className="text-sm font-bold text-slate-800">
              Employment status *
            </label>
            <select
              id="tp-employment"
              className={inputClass}
              value={employmentStatus}
              onChange={(e) => setEmploymentStatus(e.target.value)}
            >
              {EMPLOYMENT.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 space-y-2 md:col-span-2">
            <label htmlFor="tp-role" className="text-sm font-bold text-slate-800">
              Target role / title
            </label>
            <input
              id="tp-role"
              className={inputClass}
              value={primaryRole}
              onChange={(e) => setPrimaryRole(e.target.value)}
              placeholder="e.g. Backend engineer"
            />
          </div>
          <div className="min-w-0 space-y-2">
            <label htmlFor="tp-workmode" className="text-sm font-bold text-slate-800">
              Preferred work mode *
            </label>
            <select id="tp-workmode" className={inputClass} value={workMode} onChange={(e) => setWorkMode(e.target.value)}>
              {WORK_MODES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 space-y-2">
            <label htmlFor="tp-available" className="text-sm font-bold text-slate-800">
              Available from
            </label>
            <input id="tp-available" type="date" className={inputClass} value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} />
          </div>
          <div id="tp-salary-range" className="min-w-0 space-y-2 md:col-span-2">
            <p className="text-sm font-bold text-slate-800">
              Salary (annual, INR){' '}
              <span className="font-normal text-slate-500">All optional.</span>
            </p>
            <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-3 sm:gap-x-6">
              <div className="min-w-0 space-y-2">
                <label htmlFor="tp-current-salary" className="text-sm font-bold text-slate-800">
                  Current
                </label>
                <input
                  id="tp-current-salary"
                  type="number"
                  min={0}
                  step={10000}
                  className={`${inputClass}${errRing(!!fieldErrors.salaryRange)}`}
                  value={currentSalary}
                  onChange={(e) => {
                    setCurrentSalary(e.target.value);
                    clearFieldError('salaryRange');
                  }}
                  placeholder="—"
                  inputMode="numeric"
                />
              </div>
              <div className="min-w-0 space-y-2">
                <label htmlFor="tp-smin" className="text-sm font-bold text-slate-800">
                  Expected from
                </label>
                <input
                  id="tp-smin"
                  type="number"
                  min={0}
                  step={10000}
                  className={`${inputClass}${errRing(!!fieldErrors.salaryRange)}`}
                  value={salaryMin}
                  onChange={(e) => {
                    setSalaryMin(e.target.value);
                    clearFieldError('salaryRange');
                  }}
                  placeholder="—"
                  inputMode="numeric"
                />
              </div>
              <div className="min-w-0 space-y-2">
                <label htmlFor="tp-smax" className="text-sm font-bold text-slate-800">
                  Expected up to
                </label>
                <input
                  id="tp-smax"
                  type="number"
                  min={0}
                  step={10000}
                  className={`${inputClass}${errRing(!!fieldErrors.salaryRange)}`}
                  value={salaryMax}
                  onChange={(e) => {
                    setSalaryMax(e.target.value);
                    clearFieldError('salaryRange');
                  }}
                  placeholder="—"
                  inputMode="numeric"
                />
              </div>
            </div>
            <InlineFieldError id="tp-salary-range-error" message={fieldErrors.salaryRange} />
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-5 border-t border-slate-100 pt-6 sm:gap-x-6 sm:gap-y-6 md:grid-cols-2">
          <div className={`${sectionHeadingClass}`}>
            <HiDocumentArrowUp className="h-4 w-4 shrink-0" aria-hidden />
            Skills &amp; resume
          </div>
          <div className="min-w-0 space-y-2 md:col-span-2">
            <label htmlFor="tp-primary-skills" className="text-sm font-bold text-slate-800">
              Primary skills *
            </label>
            <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-stretch sm:gap-2">
              <input
                id="tp-primary-skills"
                className={`${inputClass}${errRing(!!fieldErrors.primarySkills)}`}
                value={primarySkillInput}
                onChange={(e) => {
                  setPrimarySkillInput(e.target.value);
                  clearFieldError('primarySkills');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addSkill(primarySkillInput, primarySkills, setPrimarySkills, setPrimarySkillInput);
                    clearFieldError('primarySkills');
                  }
                }}
                placeholder="e.g. Java — Enter to add"
                aria-invalid={fieldErrors.primarySkills ? true : undefined}
                aria-describedby={fieldErrors.primarySkills ? 'tp-primary-skills-error' : undefined}
              />
              <button
                type="button"
                className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-5 text-base font-bold text-white hover:bg-indigo-700 sm:w-auto sm:min-w-22 sm:text-sm cursor-pointer transition-colors duration-200"
                onClick={() => {
                  addSkill(primarySkillInput, primarySkills, setPrimarySkills, setPrimarySkillInput);
                  clearFieldError('primarySkills');
                }}
              >
                Add
              </button>
            </div>
            <div className="mt-2 flex min-w-0 flex-wrap gap-2">
              {primarySkills.map((s) => (
                <span
                  key={s}
                  className="inline-flex max-w-full min-h-11 items-center gap-1 rounded-lg border border-indigo-100 bg-indigo-50 py-1 pl-2.5 pr-1 text-sm font-semibold text-indigo-900"
                >
                  <span className="min-w-0 truncate">{s}</span>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-indigo-500 hover:bg-indigo-100 hover:text-indigo-900 cursor-pointer transition-colors duration-200"
                    onClick={() => {
                      removeSkill(s, primarySkills, setPrimarySkills);
                    }}
                    aria-label={`Remove ${s}`}
                  >
                    <HiXMark className="h-4 w-4" aria-hidden />
                  </button>
                </span>
              ))}
            </div>
            <InlineFieldError id="tp-primary-skills-error" message={fieldErrors.primarySkills} />
          </div>
          <div className="min-w-0 space-y-2 md:col-span-2">
            <label htmlFor="tp-secondary-skills" className="text-sm font-bold text-slate-800">
              Secondary skills
            </label>
            <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-stretch sm:gap-2">
              <input
                id="tp-secondary-skills"
                className={inputClass}
                value={secondarySkillInput}
                onChange={(e) => setSecondarySkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addSkill(secondarySkillInput, secondarySkills, setSecondarySkills, setSecondarySkillInput);
                  }
                }}
                placeholder="Optional — Enter to add"
              />
              <button
                type="button"
                className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-xl bg-slate-700 px-5 text-base font-bold text-white hover:bg-slate-800 sm:w-auto sm:min-w-22 sm:text-sm cursor-pointer transition-colors duration-200"
                onClick={() => addSkill(secondarySkillInput, secondarySkills, setSecondarySkills, setSecondarySkillInput)}
              >
                Add
              </button>
            </div>
            <div className="mt-2 flex min-w-0 flex-wrap gap-2">
              {secondarySkills.map((s) => (
                <span
                  key={s}
                  className="inline-flex max-w-full min-h-11 items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 py-1 pl-2.5 pr-1 text-sm font-semibold text-slate-800"
                >
                  <span className="min-w-0 truncate">{s}</span>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200 hover:text-slate-900 cursor-pointer transition-colors duration-200"
                    onClick={() => removeSkill(s, secondarySkills, setSecondarySkills)}
                    aria-label={`Remove ${s}`}
                  >
                    <HiXMark className="h-4 w-4" aria-hidden />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div id="tp-resume-upload" className="min-w-0 space-y-2 md:col-span-2">
            <span className="text-sm font-bold text-slate-800">Resume *</span>
            <div className="relative min-h-22">
              <input
                type="file"
                accept={RESUME_ACCEPT}
                onChange={(e) => {
                  setResumeFile(e.target.files?.[0] || null);
                  clearFieldError('resume');
                }}
                className="absolute inset-0 z-10 h-full min-h-22 w-full cursor-pointer opacity-0"
                aria-label="Upload resume file"
                aria-invalid={fieldErrors.resume ? true : undefined}
                aria-describedby={fieldErrors.resume ? 'tp-resume-error' : undefined}
              />
              <div
                className={`flex min-h-22 flex-col items-stretch justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:py-3 transition-[border-color,background-color] duration-200 touch-manipulation ${
                  fieldErrors.resume
                    ? 'border-red-400 bg-red-50/50'
                    : resumeFile
                      ? 'border-indigo-400 bg-indigo-50/60'
                      : 'border-slate-200 bg-slate-50/90 hover:border-indigo-200'
                }`}
              >
                <HiDocumentArrowUp className="h-8 w-8 shrink-0 self-start text-indigo-600 sm:self-center" aria-hidden />
                <div className="min-w-0 flex-1 text-sm">
                  {resumeFile ? (
                    <>
                      <p className="break-all font-bold text-slate-900">{resumeFile.name}</p>
                      <p className="text-slate-500 text-xs">PDF / DOC / DOCX · max {RESUME_MAX_SIZE_MB} MB</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-slate-800">Drop or tap to upload</p>
                      <p className="mt-1 text-xs text-slate-500">PDF, Word · up to {RESUME_MAX_SIZE_MB} MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <InlineFieldError id="tp-resume-error" message={fieldErrors.resume} />
          </div>
          <div className="min-w-0 space-y-3 md:col-span-2">
            <label htmlFor="tp-comm" className="block text-sm font-bold text-slate-800 leading-snug">
              Communication confidence (1 = learning, 10 = very strong) *
            </label>
            <div
              className={`rounded-xl border px-3 py-4 sm:px-4 ${
                fieldErrors.communication
                  ? 'border-red-400 bg-red-50/40 ring-2 ring-red-100'
                  : 'border-slate-200/90 bg-slate-50/80'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                  <span className="w-6 shrink-0 text-center text-xs font-bold text-slate-500">1</span>
                  <input
                    id="tp-comm"
                    type="range"
                    min={1}
                    max={10}
                    value={communicationLevel}
                    onChange={(e) => {
                      setCommunicationLevel(Number(e.target.value));
                      clearFieldError('communication');
                    }}
                    aria-valuemin={1}
                    aria-valuemax={10}
                    aria-valuenow={communicationLevel}
                    aria-valuetext={`${communicationLevel} out of 10`}
                    aria-invalid={fieldErrors.communication ? true : undefined}
                    aria-describedby={fieldErrors.communication ? 'tp-comm-error' : undefined}
                    className="h-11 min-w-0 flex-1 cursor-pointer accent-indigo-600 touch-manipulation"
                  />
                  <span className="w-6 shrink-0 text-center text-xs font-bold text-slate-500">10</span>
                </div>
                <span
                  className="flex shrink-0 items-center justify-center rounded-xl bg-white px-4 py-2 text-center text-lg font-bold tabular-nums text-indigo-700 ring-1 ring-slate-200/90 sm:min-w-13"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {communicationLevel}
                </span>
              </div>
            </div>
            <InlineFieldError id="tp-comm-error" message={fieldErrors.communication} />
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-5 border-t border-slate-100 pt-6 sm:gap-x-6 sm:gap-y-6 md:grid-cols-2">
          <div className={`${sectionHeadingClass}`}>
            <HiGlobeAlt className="h-4 w-4 shrink-0" aria-hidden />
            Links
          </div>
          <div className="min-w-0 space-y-2">
            <label htmlFor="tp-li" className="text-sm font-bold text-slate-800">
              LinkedIn URL *
            </label>
            <input
              id="tp-li"
              type="text"
              inputMode="url"
              autoComplete="url"
              required
              className={`${inputClass}${errRing(!!fieldErrors.linkedinUrl)}`}
              value={linkedinUrl}
              onChange={(e) => {
                setLinkedinUrl(e.target.value);
                clearFieldError('linkedinUrl');
              }}
              placeholder="https://www.linkedin.com/in/…"
              aria-invalid={fieldErrors.linkedinUrl ? true : undefined}
              aria-describedby={fieldErrors.linkedinUrl ? 'tp-li-error' : undefined}
            />
            <InlineFieldError id="tp-li-error" message={fieldErrors.linkedinUrl} />
          </div>
          <div className="min-w-0 space-y-2">
            <label htmlFor="tp-portfolio" className="text-sm font-bold text-slate-800">
              Portfolio / GitHub *
            </label>
            <input
              id="tp-portfolio"
              type="text"
              inputMode="url"
              autoComplete="url"
              required
              className={`${inputClass}${errRing(!!fieldErrors.portfolioUrl)}`}
              value={portfolioUrl}
              onChange={(e) => {
                setPortfolioUrl(e.target.value);
                clearFieldError('portfolioUrl');
              }}
              placeholder="https://github.com/… or your portfolio URL"
              aria-invalid={fieldErrors.portfolioUrl ? true : undefined}
              aria-describedby={fieldErrors.portfolioUrl ? 'tp-portfolio-error' : undefined}
            />
            <InlineFieldError id="tp-portfolio-error" message={fieldErrors.portfolioUrl} />
          </div>
        </div>

        <div
          id="tp-consent"
          className={`rounded-xl border p-3 sm:p-4 ${
            fieldErrors.consent ? 'border-red-400 bg-red-50/60 ring-2 ring-red-100' : 'border-slate-200/80 bg-slate-50/50'
          }`}
        >
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                clearFieldError('consent');
              }}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              aria-invalid={fieldErrors.consent ? true : undefined}
              aria-describedby={fieldErrors.consent ? 'tp-consent-error' : undefined}
            />
            <span className="text-sm text-slate-600 leading-snug">
              I agree that Naveen Talent Hub may store my profile and contact me about job opportunities that match my skills. I
              understand I can ask to be removed at any time.
            </span>
          </label>
          <div className="mt-2 px-0.5">
            <InlineFieldError id="tp-consent-error" message={fieldErrors.consent} />
          </div>
        </div>

        {formError ? (
          <div
            id="tp-async-error"
            className="flex gap-3 rounded-xl border border-red-200/90 bg-red-50/95 px-4 py-3.5 text-sm font-semibold text-red-900 shadow-sm"
            role="alert"
          >
            <HiExclamationCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
            <span className="min-w-0 leading-snug">{formError}</span>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="nth-btn-primary w-full min-h-12 cursor-pointer text-base transition-opacity duration-200 disabled:opacity-60 sm:w-auto sm:min-w-52 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 touch-manipulation"
        >
          {submitting ? 'Submitting…' : 'Join the shortlist'}
        </button>
      </form>
    </>
  );

  if (!isPage) {
    return (
      <div>
        {formBody}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-100/90 sm:rounded-3xl motion-reduce:transition-none">
      {formBody}
    </div>
  );
}
