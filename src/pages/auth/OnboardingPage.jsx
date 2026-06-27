import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { setAspirantProfile } from '../../store/slices/aspirantSlice';
import { supabase } from '../../lib/supabase';
import { ButtonLoader, PageLoader } from '../../components/ui/Loader';
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
} from '../../lib/onboardingDraft';
import { HiXMark } from 'react-icons/hi2';
import {
  EMPLOYMENT_OPTIONS,
  WORK_MODE_OPTIONS,
  defaultEducation,
  defaultProfileForm,
  buildAspirantPayload,
  profileToForm,
  saveAspirantProfile,
  isLinkedInProfileUrl,
  isValidHttpUrl,
  isValidMobileNumber,
  MOBILE_VALIDATION_MESSAGE,
  toFormEducation,
  validateEducationFields,
  validateJobDomains,
} from '../../lib/aspirantProfile';
import {
  JOB_DOMAIN_SUGGESTIONS,
  MAX_JOB_DOMAINS,
  QUALIFICATION_OPTIONS,
  EDUCATION_PATH_OPTIONS,
  INTERMEDIATE_TYPE_OPTIONS,
  COLLEGE_STANDING_OPTIONS,
  GRADUATION_SCORE_TYPE_OPTIONS,
  ROLE_SPECIALIZATION_SUGGESTIONS,
  getBranchOptions,
  defaultRoleTitleForDomain,
  formatCollegeStandingOption,
  parseCollegeStandingOption,
  NOTICE_PERIOD_OPTIONS,
  jobDomainLabel,
  normalizeJobDomainEntry,
} from '../../lib/aspirantFilterOptions';

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--nth-primary))] focus:border-transparent';
const labelClass = 'block text-sm font-medium text-slate-300 mb-2';
const selectClass = inputClass + ' cursor-pointer';

const STEPS = [
  { id: 'personal', title: 'Personal' },
  { id: 'career', title: 'Career' },
  { id: 'education', title: 'Education' },
  { id: 'skills', title: 'Skills' },
  { id: 'finish', title: 'Links & resume' },
];

function SkillTags({ skills, onRemove, input, onInputChange, onAdd, placeholder, label }) {
  return (
    <div className="space-y-2">
      <label className={labelClass}>{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {skills.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-slate-200 text-sm"
          >
            {skill}
            <button
              type="button"
              onClick={() => onRemove(skill)}
              className="hover:text-white"
              aria-label={`Remove ${skill}`}
            >
              <HiXMark className="w-4 h-4" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAdd())}
          className={`${inputClass} min-w-0 flex-1`}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={onAdd}
          className="w-full sm:w-auto shrink-0 px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white font-medium hover:bg-white/15 sm:whitespace-nowrap"
        >
          Add
        </button>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const user = useAppSelector((state) => state.auth.user);
  const aspirantProfile = useAppSelector((state) => state.aspirant.profile);
  const aspirantLoading = useAppSelector((state) => state.aspirant.loading);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const welcomeFromPayment = searchParams.get('welcome') === '1';
  const formInitializedRef = useRef(false);

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [form, setForm] = useState({ ...defaultProfileForm, education: { ...defaultEducation } });
  const [skillInput, setSkillInput] = useState('');
  const [secondarySkillInput, setSecondarySkillInput] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [formReady, setFormReady] = useState(false);

  // Hydrate once from draft or profile — never reset when aspirantProfile refetches (tab focus, etc.).
  useEffect(() => {
    if (!user?.id || aspirantLoading || formInitializedRef.current) return;

    const draft = loadOnboardingDraft(user.id);
    if (draft?.form) {
      setForm({
        ...defaultProfileForm,
        ...draft.form,
        email: user.email ?? draft.form.email ?? '',
        education: {
          ...defaultEducation,
          ...toFormEducation(draft.form.education),
        },
      });
      if (Number.isFinite(draft.step)) setStep(Math.min(Math.max(0, draft.step), STEPS.length - 1));
      if (typeof draft.skillInput === 'string') setSkillInput(draft.skillInput);
      if (typeof draft.secondarySkillInput === 'string') setSecondarySkillInput(draft.secondarySkillInput);
    } else {
      const base = profileToForm(aspirantProfile);
      setForm({
        ...base,
        email: user.email ?? base.email,
        education: base.education ?? { ...defaultEducation },
      });
    }

    setFormReady(true);
    formInitializedRef.current = true;
  }, [user?.id, user?.email, aspirantProfile, aspirantLoading]);

  // Persist in-progress onboarding so switching browser tabs does not lose work.
  useEffect(() => {
    if (!user?.id || !formInitializedRef.current) return;
    saveOnboardingDraft(user.id, {
      form,
      step,
      skillInput,
      secondarySkillInput,
    });
  }, [user?.id, form, step, skillInput, secondarySkillInput]);

  if (!user || aspirantLoading || !formReady) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'rgb(var(--nth-bg-dark))' }}
      >
        <PageLoader size="md" label="Loading your profile…" />
      </div>
    );
  }

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const updateEducation = (level, field, value) => {
    setForm((f) => ({
      ...f,
      education: { ...f.education, [level]: { ...f.education[level], [field]: value } },
    }));
  };

  const addSkill = (listKey, inputKey, setInput) => {
    const value = (listKey === 'skills' ? skillInput : secondarySkillInput).trim();
    if (!value || form[listKey].includes(value)) return;
    setForm((f) => ({ ...f, [listKey]: [...f[listKey], value] }));
    setInput('');
  };

  const removeSkill = (listKey, skill) => {
    setForm((f) => ({ ...f, [listKey]: f[listKey].filter((s) => s !== skill) }));
  };

  const validateStep = (index) => {
    if (index === 0) {
      if (!form.fullName.trim()) return 'Full name is required.';
      if (!form.phone.trim()) return 'Mobile number is required.';
      if (!isValidMobileNumber(form.phone)) return MOBILE_VALIDATION_MESSAGE;
      if (!form.city.trim()) return 'Current city is required.';
    }
    if (index === 1) {
      const domainErr = validateJobDomains(form);
      if (domainErr) return domainErr;
      if (!form.roleTitle.trim()) return 'Role title is required (e.g. Frontend Developer).';
      if (!form.noticePeriod) return 'Select your notice period / joining timeline.';
      if (!form.isFresher) {
        if (!form.yearsExperience.trim()) return 'Years of experience is required.';
        const yrs = parseFloat(form.yearsExperience);
        if (!Number.isFinite(yrs) || yrs < 0) return 'Enter valid years of experience.';
      }
    }
    if (index === 2) {
      const eduErr = validateEducationFields(form);
      if (eduErr) return eduErr;
      if (!form.collegeName.trim()) return 'College name is required.';
      if (!form.isCurrentlyStudying && !form.graduationYear) {
        return 'Graduation year (batch) is required.';
      }
      if (form.isCurrentlyStudying && !form.expectedGraduationYear) {
        return 'Expected graduation year is required.';
      }
      if (!form.isCurrentlyStudying) {
        if (!form.graduationScore.trim()) return 'Enter your CGPA or percentage.';
        const score = parseFloat(form.graduationScore);
        if (!Number.isFinite(score) || score <= 0) return 'Enter a valid score.';
        if (form.graduationScoreType === 'cgpa' && score > 10) {
          return 'CGPA should be 10 or below.';
        }
        if (form.graduationScoreType === 'percentage' && score > 100) {
          return 'Percentage should be 100 or below.';
        }
      }
      if (form.educationPath === 'twelfth_degree' || form.educationPath === 'diploma_degree') {
        if (!form.education.tenth.year) return '10th passing year is required.';
      }
      if (form.educationPath === 'twelfth_degree' && form.intermediateType === 'twelfth') {
        if (!form.education.twelfth.year) return '12th passing year is required.';
      }
      if (
        (form.educationPath === 'diploma_degree' || form.intermediateType === 'diploma')
        && !form.education.diploma?.year
      ) {
        return 'Diploma passing year is required.';
      }
    }
    if (index === 3) {
      if (form.skills.length === 0) return 'Add at least one primary skill.';
    }
    if (index === 4) {
      if (!form.linkedinUrl.trim()) return 'LinkedIn profile URL is required.';
      if (!isLinkedInProfileUrl(form.linkedinUrl)) {
        return 'Enter a valid LinkedIn profile URL (e.g. https://www.linkedin.com/in/your-profile).';
      }
      if (form.portfolioUrl.trim() && !isValidHttpUrl(form.portfolioUrl)) {
        return 'Portfolio URL must be a valid http(s) link.';
      }
      if (!resumeFile) return 'Please upload your resume to continue.';
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setMessage({ type: 'error', text: err });
      return;
    }
    setMessage({ type: '', text: '' });
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setMessage({ type: '', text: '' });
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateStep(step);
    if (err) {
      setMessage({ type: 'error', text: err });
      return;
    }
    setMessage({ type: '', text: '' });
    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      setMessage({ type: 'error', text: 'Session expired. Please sign in again.' });
      setSubmitting(false);
      return;
    }

    const payload = buildAspirantPayload(form, session.user.id);

    const ext = resumeFile.name.split('.').pop()?.toLowerCase() || 'pdf';
    const storagePath = `${session.user.id}/resume.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(storagePath, resumeFile, { upsert: true });
    if (uploadError) {
      setMessage({ type: 'error', text: uploadError.message ?? 'Failed to upload resume.' });
      setSubmitting(false);
      return;
    }
    payload.resume_url = storagePath;

    try {
      const profile = await saveAspirantProfile(supabase, payload);
      dispatch(setAspirantProfile(profile ?? payload));
      clearOnboardingDraft(session.user.id);
      navigate('/dashboard/profile', { replace: true });
    } catch (e) {
      setMessage({ type: 'error', text: e.message ?? 'Failed to save profile.' });
    } finally {
      setSubmitting(false);
    }
  };

  const branchOptions = getBranchOptions(form.highestQualification);

  const handleQualificationChange = (qual) => {
    setForm((f) => ({
      ...f,
      highestQualification: qual,
      highestQualificationOther: qual === 'other' ? f.highestQualificationOther : '',
      degreeBranch: '',
      degreeBranchOther: '',
    }));
  };

  const handleBranchChange = (branch) => {
    setForm((f) => ({
      ...f,
      degreeBranch: branch,
      degreeBranchOther: branch === 'other' ? f.degreeBranchOther : '',
    }));
  };

  const handleCollegeStandingChange = (value) => {
    const { premierInstituteType, instituteTier } = parseCollegeStandingOption(value);
    setForm((f) => ({
      ...f,
      premierInstituteType,
      instituteTier,
    }));
  };

  const domainKey = (value) => String(value ?? '').trim().toLowerCase();

  const toggleJobDomain = (value) => {
    const normalized = normalizeJobDomainEntry(value);
    if (!normalized) return;
    setForm((f) => {
      const key = domainKey(normalized);
      const has = f.jobDomains.some((d) => domainKey(d) === key);
      const jobDomains = has
        ? f.jobDomains.filter((d) => domainKey(d) !== key)
        : f.jobDomains.length >= MAX_JOB_DOMAINS
          ? f.jobDomains
          : [...f.jobDomains, normalized];
      const updates = { jobDomains };
      if (!f.roleTitle.trim() && jobDomains.length > 0) {
        const title = defaultRoleTitleForDomain(jobDomains[0]);
        if (title) {
          updates.roleTitle = title;
          updates.primaryRole = title;
        }
      }
      return { ...f, ...updates };
    });
  };

  const addCustomJobDomain = () => {
    const normalized = normalizeJobDomainEntry(domainInput);
    if (!normalized) return;
    const key = domainKey(normalized);
    if (form.jobDomains.some((d) => domainKey(d) === key)) {
      setDomainInput('');
      return;
    }
    if (form.jobDomains.length >= MAX_JOB_DOMAINS) return;
    setForm((f) => {
      const jobDomains = [...f.jobDomains, normalized];
      const updates = { jobDomains };
      if (!f.roleTitle.trim()) {
        const title = defaultRoleTitleForDomain(normalized);
        if (title) {
          updates.roleTitle = title;
          updates.primaryRole = title;
        }
      }
      return { ...f, ...updates };
    });
    setDomainInput('');
  };

  const removeJobDomain = (domain) => {
    setForm((f) => ({
      ...f,
      jobDomains: f.jobDomains.filter((d) => d !== domain),
    }));
  };

  const toggleRoleSpec = (spec) => {
    setForm((f) => {
      const list = f.roleSpecializations.includes(spec)
        ? f.roleSpecializations.filter((s) => s !== spec)
        : [...f.roleSpecializations, spec];
      return { ...f, roleSpecializations: list };
    });
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          'linear-gradient(180deg, #0b1220 0%, rgb(var(--nth-bg-dark)) 32%, #0f172a 100%)',
      }}
    >
      <header className="shrink-0 border-b border-white/10 bg-[#0b1220]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-center px-4 sm:px-6">
          <img
            src="/white-logo.png"
            alt="Naveen Talent Hub"
            className="h-9 w-auto object-contain sm:h-10"
          />
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--nth-primary))]">
              Step {step + 1} of {STEPS.length}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Complete your profile
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400 sm:text-base">
              {welcomeFromPayment
                ? 'Your plan is active. Tell us about your experience so we can schedule your mock interviews.'
                : 'Tell us about your experience and skills so we can match you with the right opportunities.'}
            </p>
          </div>

          <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <p className="mb-2 text-center text-xs font-medium text-slate-400 sm:hidden">
              Step {step + 1} of {STEPS.length}: {STEPS[step].title}
            </p>
            <div className="mb-3 hidden gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-500 sm:flex sm:justify-between">
              {STEPS.map((s, i) => (
                <span
                  key={s.id}
                  className={`shrink-0 ${
                    i === step
                      ? 'text-[hsl(var(--nth-primary))]'
                      : i < step
                        ? 'text-slate-300'
                        : ''
                  }`}
                >
                  {s.title}
                </span>
              ))}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[hsl(var(--nth-primary))] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <form onSubmit={step === STEPS.length - 1 ? handleSubmit : (e) => { e.preventDefault(); goNext(); }} className="space-y-6">
            {step === 0 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-white">Personal details</h2>
                <div>
                  <label htmlFor="fullName" className={labelClass}>Full name *</label>
                  <input id="fullName" type="text" value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} required className={inputClass} placeholder="Your name" />
                </div>
                <div>
                  <label htmlFor="email" className={labelClass}>Email</label>
                  <input id="email" type="email" value={form.email} readOnly className={inputClass + ' opacity-80 cursor-not-allowed'} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className={labelClass}>Mobile number *</label>
                    <input id="phone" type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} required className={inputClass} placeholder="10-digit mobile number" inputMode="numeric" />
                  </div>
                  <div>
                    <label htmlFor="city" className={labelClass}>Current city *</label>
                    <input id="city" type="text" value={form.city} onChange={(e) => setField('city', e.target.value)} required className={inputClass} placeholder="e.g. Hyderabad" />
                  </div>
                </div>
                <div>
                  <label htmlFor="country" className={labelClass}>Country</label>
                  <input id="country" type="text" value={form.country} onChange={(e) => setField('country', e.target.value)} className={inputClass} placeholder="India" />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={form.willingRelocate} onChange={(e) => setField('willingRelocate', e.target.checked)} className="rounded border-white/20" />
                  Open to relocating for the right role
                </label>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-white">Career & domain</h2>
                <div className="flex flex-wrap gap-3">
                  <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-colors ${form.isFresher ? 'border-[hsl(var(--nth-primary))] bg-[hsl(var(--nth-primary))]/10 text-white' : 'border-white/10 text-slate-300'}`}>
                    <input type="radio" name="track" checked={form.isFresher} onChange={() => setField('isFresher', true)} className="sr-only" />
                    Fresher
                  </label>
                  <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-colors ${!form.isFresher ? 'border-[hsl(var(--nth-primary))] bg-[hsl(var(--nth-primary))]/10 text-white' : 'border-white/10 text-slate-300'}`}>
                    <input type="radio" name="track" checked={!form.isFresher} onChange={() => setField('isFresher', false)} className="sr-only" />
                    Experienced
                  </label>
                </div>
                <div>
                  <p className={labelClass}>
                    Target domains * <span className="text-slate-500 font-normal">(up to {MAX_JOB_DOMAINS})</span>
                  </p>
                  <p className="text-xs text-slate-500 mb-2">
                    Pick suggestions or type your own — e.g. Frontend, Backend, Data Engineering
                  </p>
                  {form.jobDomains.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {form.jobDomains.map((domain) => (
                        <span
                          key={domain}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-slate-200 text-sm"
                        >
                          {jobDomainLabel(domain)}
                          <button
                            type="button"
                            onClick={() => removeJobDomain(domain)}
                            className="hover:text-white"
                            aria-label={`Remove ${jobDomainLabel(domain)}`}
                          >
                            <HiXMark className="w-4 h-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {JOB_DOMAIN_SUGGESTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => toggleJobDomain(o.value)}
                        disabled={
                          form.jobDomains.length >= MAX_JOB_DOMAINS
                          && !form.jobDomains.some((d) => domainKey(d) === domainKey(o.value))
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          form.jobDomains.some((d) => domainKey(d) === domainKey(o.value))
                            ? 'border-[hsl(var(--nth-primary))] bg-[hsl(var(--nth-primary))]/15 text-white'
                            : 'border-white/15 text-slate-300 hover:border-white/30'
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      id="jobDomainCustom"
                      type="text"
                      value={domainInput}
                      onChange={(e) => setDomainInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomJobDomain())}
                      className={`${inputClass} min-w-0 flex-1`}
                      placeholder="Type a domain and press Enter — e.g. Cloud, Cyber Security"
                      disabled={form.jobDomains.length >= MAX_JOB_DOMAINS}
                    />
                    <button
                      type="button"
                      onClick={addCustomJobDomain}
                      disabled={!domainInput.trim() || form.jobDomains.length >= MAX_JOB_DOMAINS}
                      className="w-full sm:w-auto shrink-0 px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white font-medium hover:bg-white/15 sm:whitespace-nowrap disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="roleTitle" className={labelClass}>Role title *</label>
                  <input
                    id="roleTitle"
                    type="text"
                    value={form.roleTitle}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => ({ ...f, roleTitle: v, primaryRole: v }));
                    }}
                    className={inputClass}
                    placeholder="e.g. Frontend Developer"
                  />
                </div>
                <div>
                  <p className={labelClass}>Specializations (optional)</p>
                  <div className="flex flex-wrap gap-2">
                    {ROLE_SPECIALIZATION_SUGGESTIONS.slice(0, 12).map((spec) => (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => toggleRoleSpec(spec)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          form.roleSpecializations.includes(spec)
                            ? 'border-[hsl(var(--nth-primary))] bg-[hsl(var(--nth-primary))]/15 text-white'
                            : 'border-white/15 text-slate-300 hover:border-white/30'
                        }`}
                      >
                        {spec}
                      </button>
                    ))}
                  </div>
                </div>
                {!form.isFresher && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="yearsExperience" className={labelClass}>Years of experience *</label>
                      <input id="yearsExperience" type="number" min="0" step="0.5" value={form.yearsExperience} onChange={(e) => setField('yearsExperience', e.target.value)} className={inputClass} placeholder="e.g. 3" />
                    </div>
                    <div>
                      <label htmlFor="currentCtc" className={labelClass}>Current CTC (LPA)</label>
                      <input id="currentCtc" type="text" value={form.currentCtc} onChange={(e) => setField('currentCtc', e.target.value)} className={inputClass} placeholder="e.g. 8" />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="employmentStatus" className={labelClass}>Employment status</label>
                    <select id="employmentStatus" value={form.employmentStatus} onChange={(e) => setField('employmentStatus', e.target.value)} className={selectClass}>
                      {EMPLOYMENT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="workMode" className={labelClass}>Preferred work mode</label>
                    <select id="workMode" value={form.workMode} onChange={(e) => setField('workMode', e.target.value)} className={selectClass}>
                      {WORK_MODE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="noticePeriod" className={labelClass}>Notice period / joining *</label>
                    <select
                      id="noticePeriod"
                      value={form.noticePeriod}
                      onChange={(e) => setField('noticePeriod', e.target.value)}
                      className={selectClass}
                    >
                      {NOTICE_PERIOD_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>
                      ))}
                    </select>
                  </div>
                  {form.noticePeriod && form.noticePeriod !== 'immediate' && (
                    <div>
                      <label htmlFor="lastWorkingDay" className={labelClass}>Last working day (optional)</label>
                      <input
                        id="lastWorkingDay"
                        type="date"
                        value={form.availableFrom}
                        onChange={(e) => setField('availableFrom', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>
                {!form.isFresher && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="currentCompany" className={labelClass}>Current company</label>
                      <input id="currentCompany" type="text" value={form.currentCompany} onChange={(e) => setField('currentCompany', e.target.value)} className={inputClass} placeholder="Company name" />
                    </div>
                    <div>
                      <label htmlFor="previousCompany" className={labelClass}>Previous company</label>
                      <input id="previousCompany" type="text" value={form.previousCompany} onChange={(e) => setField('previousCompany', e.target.value)} className={inputClass} placeholder="If applicable" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-white">Education</h2>
                <div>
                  <label htmlFor="educationPath" className={labelClass}>Education path</label>
                  <select
                    id="educationPath"
                    value={form.educationPath}
                    onChange={(e) => setField('educationPath', e.target.value)}
                    className={selectClass}
                  >
                    {EDUCATION_PATH_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>
                    ))}
                  </select>
                </div>

                {(form.educationPath === 'twelfth_degree' || form.educationPath === 'diploma_degree') && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>10th marks</label>
                        <input type="text" value={form.education.tenth.marks} onChange={(e) => updateEducation('tenth', 'marks', e.target.value)} className={inputClass} placeholder="e.g. 95" />
                      </div>
                      <div>
                        <label className={labelClass}>10th year *</label>
                        <input type="number" min="1990" max="2030" value={form.education.tenth.year || ''} onChange={(e) => updateEducation('tenth', 'year', e.target.value)} className={inputClass} placeholder="2018" />
                      </div>
                    </div>
                    {form.educationPath === 'twelfth_degree' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>12th marks</label>
                          <input type="text" value={form.education.twelfth.marks} onChange={(e) => updateEducation('twelfth', 'marks', e.target.value)} className={inputClass} placeholder="e.g. 92" />
                        </div>
                        <div>
                          <label className={labelClass}>12th year *</label>
                          <input type="number" min="1990" max="2030" value={form.education.twelfth.year || ''} onChange={(e) => updateEducation('twelfth', 'year', e.target.value)} className={inputClass} placeholder="2020" />
                        </div>
                      </div>
                    )}
                    {form.educationPath === 'diploma_degree' && (
                      <div className="space-y-4 rounded-xl border border-white/10 p-4">
                        <p className="text-sm font-medium text-slate-300">Diploma details</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className={labelClass}>Diploma branch</label>
                            <input type="text" value={form.education.diploma.branch} onChange={(e) => updateEducation('diploma', 'branch', e.target.value)} className={inputClass} placeholder="CSE" />
                          </div>
                          <div>
                            <label className={labelClass}>Diploma year *</label>
                            <input type="number" min="1990" max="2030" value={form.education.diploma.year || ''} onChange={(e) => updateEducation('diploma', 'year', e.target.value)} className={inputClass} />
                          </div>
                        </div>
                        <div>
                          <label className={labelClass}>Diploma college</label>
                          <input type="text" value={form.education.diploma.college} onChange={(e) => updateEducation('diploma', 'college', e.target.value)} className={inputClass} placeholder="Polytechnic name" />
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="highestQualification" className={labelClass}>Highest qualification *</label>
                    <select
                      id="highestQualification"
                      value={form.highestQualification}
                      onChange={(e) => handleQualificationChange(e.target.value)}
                      className={selectClass}
                    >
                      <option value="" className="bg-slate-900">Select qualification</option>
                      {QUALIFICATION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {form.highestQualification === 'other' && (
                  <div>
                    <label htmlFor="highestQualificationOther" className={labelClass}>Specify qualification *</label>
                    <input
                      id="highestQualificationOther"
                      type="text"
                      value={form.highestQualificationOther}
                      onChange={(e) => setField('highestQualificationOther', e.target.value)}
                      required
                      className={inputClass}
                      placeholder="e.g. B.Com, BBA"
                    />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="degreeBranch" className={labelClass}>Branch / course *</label>
                    <select
                      id="degreeBranch"
                      value={form.degreeBranch}
                      onChange={(e) => handleBranchChange(e.target.value)}
                      className={selectClass}
                      disabled={!form.highestQualification}
                    >
                      <option value="" className="bg-slate-900">
                        {form.highestQualification ? 'Select branch' : 'Select qualification first'}
                      </option>
                      {branchOptions.map((o) => (
                        <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {form.degreeBranch === 'other' && (
                  <div>
                    <label htmlFor="degreeBranchOther" className={labelClass}>Specify branch / course *</label>
                    <input
                      id="degreeBranchOther"
                      type="text"
                      value={form.degreeBranchOther}
                      onChange={(e) => setField('degreeBranchOther', e.target.value)}
                      required
                      className={inputClass}
                      placeholder="e.g. CSE, Mechanical, Electronics"
                    />
                  </div>
                )}
                <div>
                  <label htmlFor="collegeName" className={labelClass}>College / university name *</label>
                  <input id="collegeName" type="text" value={form.collegeName} onChange={(e) => setField('collegeName', e.target.value)} className={inputClass} placeholder="e.g. JNTUH, IIT Hyderabad" />
                </div>
                <div>
                  <label htmlFor="collegeStanding" className={labelClass}>College tier / institute</label>
                  <select
                    id="collegeStanding"
                    value={formatCollegeStandingOption(form.premierInstituteType, form.instituteTier)}
                    onChange={(e) => handleCollegeStandingChange(e.target.value)}
                    className={selectClass}
                  >
                    {COLLEGE_STANDING_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value} className="bg-slate-900">
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="graduationScoreType" className={labelClass}>Score type</label>
                    <select id="graduationScoreType" value={form.graduationScoreType} onChange={(e) => setField('graduationScoreType', e.target.value)} className={selectClass}>
                      {GRADUATION_SCORE_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isCurrentlyStudying}
                    onChange={(e) => setField('isCurrentlyStudying', e.target.checked)}
                    className="rounded border-white/20"
                  />
                  I am currently studying (final year)
                </label>
                {form.isCurrentlyStudying ? (
                  <div>
                    <label htmlFor="expectedGraduationYear" className={labelClass}>Expected graduation year *</label>
                    <input id="expectedGraduationYear" type="number" min="2020" max="2035" value={form.expectedGraduationYear} onChange={(e) => setField('expectedGraduationYear', e.target.value)} className={inputClass} placeholder="2025" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="graduationYear" className={labelClass}>Graduation year (batch) *</label>
                      <input id="graduationYear" type="number" min="1990" max="2035" value={form.graduationYear} onChange={(e) => setField('graduationYear', e.target.value)} className={inputClass} placeholder="2024" />
                    </div>
                    <div>
                      <label htmlFor="graduationScore" className={labelClass}>
                        {form.graduationScoreType === 'percentage' ? 'Percentage' : 'CGPA'} *
                      </label>
                      <input id="graduationScore" type="number" step="0.01" min="0" value={form.graduationScore} onChange={(e) => setField('graduationScore', e.target.value)} className={inputClass} placeholder={form.graduationScoreType === 'percentage' ? '85' : '8.5'} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white">Skills</h2>
                <SkillTags
                  label="Primary skills *"
                  skills={form.skills}
                  onRemove={(s) => removeSkill('skills', s)}
                  input={skillInput}
                  onInputChange={setSkillInput}
                  onAdd={() => addSkill('skills', 'skillInput', setSkillInput)}
                  placeholder="e.g. React, Java, SQL — press Enter"
                />
                <SkillTags
                  label="Secondary skills (optional)"
                  skills={form.secondarySkills}
                  onRemove={(s) => removeSkill('secondarySkills', s)}
                  input={secondarySkillInput}
                  onInputChange={setSecondarySkillInput}
                  onAdd={() => addSkill('secondarySkills', 'secondarySkillInput', setSecondarySkillInput)}
                  placeholder="e.g. Docker, AWS"
                />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-white">Links & resume</h2>
                <div>
                  <label htmlFor="linkedin" className={labelClass}>LinkedIn profile *</label>
                  <input id="linkedin" type="url" value={form.linkedinUrl} onChange={(e) => setField('linkedinUrl', e.target.value)} className={inputClass} placeholder="https://www.linkedin.com/in/your-profile" />
                </div>
                <div>
                  <label htmlFor="portfolio" className={labelClass}>Portfolio / GitHub (optional)</label>
                  <input id="portfolio" type="url" value={form.portfolioUrl} onChange={(e) => setField('portfolioUrl', e.target.value)} className={inputClass} placeholder="https://github.com/yourname" />
                </div>
                <div>
                  <label htmlFor="bio" className={labelClass}>About you (optional)</label>
                  <textarea id="bio" rows={4} value={form.bio} onChange={(e) => setField('bio', e.target.value)} className={inputClass + ' resize-y min-h-[100px]'} placeholder="Brief summary of your background, projects, or career goals…" />
                </div>
                <div>
                  <label className={labelClass}>Resume *</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white/10 file:text-white file:font-medium hover:file:bg-white/15"
                  />
                  {resumeFile && <p className="mt-1 text-sm text-slate-500">{resumeFile.name}</p>}
                </div>
              </div>
            )}

            {message.text && (
              <div className={`rounded-lg px-4 py-3 text-sm ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                {message.text}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {step > 0 && (
                <button type="button" onClick={goBack} className="flex-1 py-3 rounded-xl border border-white/15 text-white font-medium hover:bg-white/5">
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="nth-btn-primary flex-1 py-3 rounded-xl text-base font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? <ButtonLoader label="Saving…" /> : step === STEPS.length - 1 ? 'Save & continue' : 'Continue'}
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>
    </div>
  );
}
