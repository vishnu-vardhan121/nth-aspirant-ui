import { useState, useEffect, createElement } from 'react';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { fetchAspirantProfile, setAspirantProfile } from '../../../store/slices/aspirantSlice';
import { supabase } from '../../../lib/supabase';
import { PageLoader, ButtonLoader } from '../../../components/ui/Loader';
import {
  HiXMark,
  HiUser,
  HiAcademicCap,
  HiTag,
  HiDocumentArrowDown,
  HiCheckCircle,
  HiExclamationCircle,
  HiBriefcase,
  HiGlobeAlt,
} from 'react-icons/hi2';
import {
  EMPLOYMENT_OPTIONS,
  WORK_MODE_OPTIONS,
  defaultEducation,
  buildAspirantPayload,
  profileToForm,
  saveAspirantProfile,
  isValidMobileNumber,
  isPlaceholderCity,
  MOBILE_VALIDATION_MESSAGE,
  validateEducationFields,
  validateJobDomains,
} from '../../../lib/aspirantProfile';
import {
  JOB_DOMAIN_SUGGESTIONS,
  MAX_JOB_DOMAINS,
  QUALIFICATION_OPTIONS,
  COLLEGE_STANDING_OPTIONS,
  GRADUATION_SCORE_TYPE_OPTIONS,
  ROLE_SPECIALIZATION_SUGGESTIONS,
  getBranchOptions,
  jobDomainLabel,
  jobDomainsLabel,
  qualificationLabel,
  branchLabel,
  formatCollegeStandingOption,
  parseCollegeStandingOption,
  collegeStandingLabel,
  noticePeriodLabel,
  NOTICE_PERIOD_OPTIONS,
  defaultRoleTitleForDomain,
  normalizeJobDomainEntry,
} from '../../../lib/aspirantFilterOptions';

const inputClass =
  'w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';

const selectClass = inputClass + ' cursor-pointer';

function formatJoined(values) {
  const items = values
    .map((v) => (v == null ? '' : String(v).trim()))
    .filter(Boolean);
  return items.length ? items.join(' • ') : '—';
}

function employmentLabel(value) {
  return EMPLOYMENT_OPTIONS.find((o) => o.value === value)?.label ?? value ?? '—';
}

function workModeLabel(value) {
  return WORK_MODE_OPTIONS.find((o) => o.value === value)?.label ?? value ?? '—';
}

function SectionCard({ icon, title, subtitle, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          {icon ? createElement(icon, { className: 'h-5 w-5' }) : null}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function ProfilePage() {
  const user = useAppSelector((state) => state.auth.user);
  const profile = useAppSelector((state) => state.aspirant.profile);
  const profileLoading = useAppSelector((state) => state.aspirant.loading);
  const dispatch = useAppDispatch();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('India');
  const [isFresher, setIsFresher] = useState(true);
  const [yearsExperience, setYearsExperience] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('student');
  const [primaryRole, setPrimaryRole] = useState('');
  const [jobDomains, setJobDomains] = useState([]);
  const [roleTitle, setRoleTitle] = useState('');
  const [roleSpecializations, setRoleSpecializations] = useState([]);
  const [highestQualification, setHighestQualification] = useState('');
  const [highestQualificationOther, setHighestQualificationOther] = useState('');
  const [degreeBranch, setDegreeBranch] = useState('');
  const [degreeBranchOther, setDegreeBranchOther] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [isCurrentlyStudying, setIsCurrentlyStudying] = useState(false);
  const [expectedGraduationYear, setExpectedGraduationYear] = useState('');
  const [graduationScoreType, setGraduationScoreType] = useState('cgpa');
  const [graduationScore, setGraduationScore] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [premierInstituteType, setPremierInstituteType] = useState('none');
  const [instituteTier, setInstituteTier] = useState('unrated');
  const [currentCompany, setCurrentCompany] = useState('');
  const [previousCompany, setPreviousCompany] = useState('');
  const [workMode, setWorkMode] = useState('any');
  const [currentCtc, setCurrentCtc] = useState('');
  const [expectedSalaryMin, setExpectedSalaryMin] = useState('');
  const [expectedSalaryMax, setExpectedSalaryMax] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('immediate');
  const [willingRelocate, setWillingRelocate] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [bio, setBio] = useState('');
  const [education, setEducation] = useState(defaultEducation);
  const [skills, setSkills] = useState([]);
  const [secondarySkills, setSecondarySkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [secondarySkillInput, setSecondarySkillInput] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);
  const [resumeSignedUrl, setResumeSignedUrl] = useState(null);
  const [resumeReplacementFile, setResumeReplacementFile] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (user?.id && !profile) dispatch(fetchAspirantProfile(user.id));
  }, [user?.id, dispatch, profile]);

  const applyProfileToForm = (p) => {
    const f = profileToForm(p);
    setFullName(f.fullName);
    setEmail(f.email);
    setPhone(f.phone);
    setCity(f.city);
    setCountry(f.country);
    setIsFresher(f.isFresher);
    setYearsExperience(f.yearsExperience);
    setEmploymentStatus(f.employmentStatus);
    setPrimaryRole(f.primaryRole);
    setJobDomains(f.jobDomains);
    setRoleTitle(f.roleTitle);
    setRoleSpecializations(f.roleSpecializations);
    setHighestQualification(f.highestQualification);
    setHighestQualificationOther(f.highestQualificationOther);
    setDegreeBranch(f.degreeBranch);
    setDegreeBranchOther(f.degreeBranchOther);
    setGraduationYear(f.graduationYear);
    setIsCurrentlyStudying(f.isCurrentlyStudying);
    setExpectedGraduationYear(f.expectedGraduationYear);
    setGraduationScoreType(f.graduationScoreType);
    setGraduationScore(f.graduationScore);
    setCollegeName(f.collegeName);
    setPremierInstituteType(f.premierInstituteType);
    setInstituteTier(f.instituteTier);
    setCurrentCompany(f.currentCompany);
    setPreviousCompany(f.previousCompany);
    setWorkMode(f.workMode);
    setCurrentCtc(f.currentCtc);
    setExpectedSalaryMin(f.expectedSalaryMin);
    setExpectedSalaryMax(f.expectedSalaryMax);
    setAvailableFrom(f.availableFrom);
    setNoticePeriod(f.noticePeriod);
    setWillingRelocate(f.willingRelocate);
    setLinkedinUrl(f.linkedinUrl);
    setPortfolioUrl(f.portfolioUrl);
    setBio(f.bio);
    setEducation(f.education);
    setSkills(f.skills);
    setSecondarySkills(f.secondarySkills);
  };

  useEffect(() => {
    if (!profile) return;
    const timer = setTimeout(() => applyProfileToForm(profile), 0);
    return () => clearTimeout(timer);
  }, [profile]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      (async () => {
        if (!profile?.resume_url) {
          if (!cancelled) setResumeSignedUrl(null);
          return;
        }
        const { data, error } = await supabase.storage
          .from('resumes')
          .createSignedUrl(profile.resume_url, 3600);
        if (!cancelled && !error && data?.signedUrl) setResumeSignedUrl(data.signedUrl);
        else if (!cancelled) setResumeSignedUrl(null);
      })();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [profile?.resume_url]);

  const addSkill = (e) => {
    e?.preventDefault?.();
    const value = skillInput.trim();
    if (value && !skills.includes(value)) {
      setSkills((prev) => [...prev, value]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  const addSecondarySkill = (e) => {
    e?.preventDefault?.();
    const value = secondarySkillInput.trim();
    if (value && !secondarySkills.includes(value)) {
      setSecondarySkills((prev) => [...prev, value]);
      setSecondarySkillInput('');
    }
  };

  const removeSecondarySkill = (skill) => {
    setSecondarySkills((prev) => prev.filter((s) => s !== skill));
  };

  const updateEducation = (level, field, value) => {
    setEducation((prev) => ({
      ...prev,
      [level]: { ...prev[level], [field]: value },
    }));
  };

  const domainKey = (value) => String(value ?? '').trim().toLowerCase();

  const toggleJobDomain = (value) => {
    const normalized = normalizeJobDomainEntry(value);
    if (!normalized) return;
    const key = domainKey(normalized);
    setJobDomains((prev) => {
      const has = prev.some((d) => domainKey(d) === key);
      if (has) return prev.filter((d) => domainKey(d) !== key);
      if (prev.length >= MAX_JOB_DOMAINS) return prev;
      const next = [...prev, normalized];
      if (!roleTitle.trim() && next.length > 0) {
        const title = defaultRoleTitleForDomain(next[0]);
        if (title) {
          setRoleTitle(title);
          setPrimaryRole(title);
        }
      }
      return next;
    });
  };

  const addCustomJobDomain = () => {
    const normalized = normalizeJobDomainEntry(domainInput);
    if (!normalized) return;
    const key = domainKey(normalized);
    if (jobDomains.some((d) => domainKey(d) === key)) {
      setDomainInput('');
      return;
    }
    if (jobDomains.length >= MAX_JOB_DOMAINS) return;
    setJobDomains((prev) => {
      const next = [...prev, normalized];
      if (!roleTitle.trim()) {
        const title = defaultRoleTitleForDomain(normalized);
        if (title) {
          setRoleTitle(title);
          setPrimaryRole(title);
        }
      }
      return next;
    });
    setDomainInput('');
  };

  const removeJobDomain = (domain) => {
    setJobDomains((prev) => prev.filter((d) => d !== domain));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    if (!user?.id || !profile) return;
    if (phone.trim() && !isValidMobileNumber(phone)) {
      setMessage({ type: 'error', text: MOBILE_VALIDATION_MESSAGE });
      return;
    }
    if (!city.trim() || isPlaceholderCity(city)) {
      setMessage({ type: 'error', text: 'Enter your current city (e.g. Hyderabad).' });
      return;
    }
    const domainErr = validateJobDomains({ jobDomains });
    if (domainErr) {
      setMessage({ type: 'error', text: domainErr });
      return;
    }
    const eduErr = validateEducationFields({
      highestQualification,
      highestQualificationOther,
      degreeBranch,
      degreeBranchOther,
      premierInstituteType,
      instituteTier,
    });
    if (eduErr) {
      setMessage({ type: 'error', text: eduErr });
      return;
    }
    setSaving(true);

    const payload = buildAspirantPayload(
      {
        fullName,
        email,
        phone,
        city,
        country,
        isFresher,
        yearsExperience,
        employmentStatus,
        primaryRole,
        jobDomains,
        roleTitle,
        roleSpecializations,
        highestQualification,
        highestQualificationOther,
        degreeBranch,
        degreeBranchOther,
        graduationYear,
        isCurrentlyStudying,
        expectedGraduationYear,
        graduationScoreType,
        graduationScore,
        collegeName,
        premierInstituteType,
        instituteTier,
        educationPath: profile?.education_path ?? 'twelfth_degree',
        intermediateType: profile?.intermediate_type ?? 'twelfth',
        communicationLevel: profile?.communication_level ?? 'not_assessed',
        currentCompany,
        previousCompany,
        workMode,
        currentCtc,
        expectedSalaryMin,
        expectedSalaryMax,
        availableFrom,
        noticePeriod,
        willingRelocate,
        linkedinUrl,
        portfolioUrl,
        bio,
        education,
        skills,
        secondarySkills,
      },
      user.id,
    );
    delete payload.id;

    if (resumeReplacementFile) {
      const ext = resumeReplacementFile.name.split('.').pop()?.toLowerCase() || 'pdf';
      const newPath = `${user.id}/resume.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(newPath, resumeReplacementFile, { upsert: true });

      if (uploadError) {
        setMessage({ type: 'error', text: uploadError.message ?? 'Failed to upload resume.' });
        setSaving(false);
        return;
      }
      payload.resume_url = newPath;
    } else if (profile.resume_url) {
      payload.resume_url = profile.resume_url;
    }

    try {
      const saved = await saveAspirantProfile(supabase, payload);
      dispatch(setAspirantProfile(saved));
      setResumeReplacementFile(null);
      setMessage({ type: 'success', text: 'Profile saved successfully.' });
      setIsEditMode(false);
    } catch (e) {
      setMessage({ type: 'error', text: e.message ?? 'Failed to save profile.' });
    } finally {
      setSaving(false);
    }
  };

  const startEditing = () => {
    setMessage({ type: '', text: '' });
    setIsEditMode(true);
  };

  const cancelEditing = () => {
    if (profile) {
      applyProfileToForm(profile);
      setSkillInput('');
      setSecondarySkillInput('');
      setResumeReplacementFile(null);
    }
    setMessage({ type: '', text: '' });
    setIsEditMode(false);
  };

  if (profileLoading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <PageLoader size="lg" label="Loading profile…" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Profile</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isEditMode
              ? 'Update your details below and save your changes.'
              : 'Review your profile details. Edit only when you need to make changes.'}
          </p>
        </div>
        <button
          type="button"
          onClick={isEditMode ? cancelEditing : startEditing}
          className={`w-full sm:w-auto inline-flex items-center justify-center rounded-lg px-4 py-2.5 min-h-[44px] text-sm font-semibold transition-colors ${
            isEditMode
              ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              : 'nth-btn-primary'
          }`}
        >
          {isEditMode ? 'Cancel edit' : 'Edit profile'}
        </button>
      </div>

      {/* Alert */}
      {message.text && (
        <div
          className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm ${
            message.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-100'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
          }`}
          role="alert"
        >
          {message.type === 'error' ? (
            <HiExclamationCircle className="h-5 w-5 shrink-0 text-red-500" />
          ) : (
            <HiCheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {!isEditMode ? (
        <>
          <SectionCard
            icon={HiUser}
            title="Personal information"
            subtitle="Basic details used in your applications"
          >
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Full name</dt>
                <dd className="mt-1 font-medium text-slate-900">{profile.full_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="mt-1 font-medium text-slate-900">{profile.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="mt-1 font-medium text-slate-900">{profile.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Current city</dt>
                <dd className="mt-1 font-medium text-slate-900">{profile.city || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Country</dt>
                <dd className="mt-1 font-medium text-slate-900">{profile.country || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Open to relocate</dt>
                <dd className="mt-1 font-medium text-slate-900">{profile.willing_relocate ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            icon={HiBriefcase}
            title="Experience & role"
            subtitle="Your track, role, and compensation expectations"
          >
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Target domains</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {jobDomainsLabel(profile.job_domains) !== '—'
                    ? jobDomainsLabel(profile.job_domains)
                    : jobDomainLabel(profile.job_domain)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Role title</dt>
                <dd className="mt-1 font-medium text-slate-900">{profile.role_title || profile.primary_role || '—'}</dd>
              </div>
              {Array.isArray(profile.role_specializations) && profile.role_specializations.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">Specializations</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {profile.role_specializations.map((s) => (
                      <span key={s} className="inline-flex px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 text-xs font-medium">{s}</span>
                    ))}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500">Track</dt>
                <dd className="mt-1 font-medium text-slate-900 capitalize">{profile.track || '—'}</dd>
              </div>
              {profile.track === 'experienced' && (
                <>
                  <div>
                    <dt className="text-slate-500">Experience</dt>
                    <dd className="mt-1 font-medium text-slate-900">
                      {profile.experience_years != null ? `${profile.experience_years} years` : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Current company</dt>
                    <dd className="mt-1 font-medium text-slate-900">{profile.current_company || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Previous company</dt>
                    <dd className="mt-1 font-medium text-slate-900">{profile.previous_company || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Current CTC</dt>
                    <dd className="mt-1 font-medium text-slate-900">{profile.current_ctc ? `${profile.current_ctc} LPA` : '—'}</dd>
                  </div>
                </>
              )}
              <div>
                <dt className="text-slate-500">Employment status</dt>
                <dd className="mt-1 font-medium text-slate-900">{employmentLabel(profile.employment_status)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Work mode</dt>
                <dd className="mt-1 font-medium text-slate-900">{workModeLabel(profile.work_mode)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Notice period</dt>
                <dd className="mt-1 font-medium text-slate-900">{noticePeriodLabel(profile.notice_period)}</dd>
              </div>
              {profile.notice_period && profile.notice_period !== 'immediate' && profile.available_from && (
                <div>
                  <dt className="text-slate-500">Last working day</dt>
                  <dd className="mt-1 font-medium text-slate-900">{profile.available_from}</dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500">Expected salary</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {formatJoined([
                    profile.expected_salary_min && `${profile.expected_salary_min} LPA`,
                    profile.expected_salary_max && `${profile.expected_salary_max} LPA`,
                  ]).replace(' • ', ' – ') || '—'}
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            icon={HiGlobeAlt}
            title="Links & bio"
            subtitle="Professional profiles and summary"
          >
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">LinkedIn</dt>
                <dd className="mt-1">
                  {profile.linkedin_url ? (
                    <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium break-all">
                      {profile.linkedin_url}
                    </a>
                  ) : (
                    <span className="text-slate-900">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Portfolio</dt>
                <dd className="mt-1">
                  {profile.portfolio_url ? (
                    <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium break-all">
                      {profile.portfolio_url}
                    </a>
                  ) : (
                    <span className="text-slate-900">—</span>
                  )}
                </dd>
              </div>
              {profile.bio && (
                <div>
                  <dt className="text-slate-500">About</dt>
                  <dd className="mt-1 text-slate-900 whitespace-pre-wrap">{profile.bio}</dd>
                </div>
              )}
            </dl>
          </SectionCard>

          <SectionCard
            icon={HiAcademicCap}
            title="Education"
            subtitle="Qualification, college, and scores"
          >
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Qualification</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {profile.highest_qualification === 'other'
                    ? (profile.education?.graduation?.type || 'Other (not specified)')
                    : qualificationLabel(profile.highest_qualification) || profile.education?.graduation?.type || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Branch</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {branchLabel(profile.highest_qualification, profile.degree_branch, profile.degree_branch_other)
                    || profile.education?.graduation?.branch || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">College</dt>
                <dd className="mt-1 font-medium text-slate-900">{profile.college_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Premier institute</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {collegeStandingLabel(profile.premier_institute_type, profile.institute_tier)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Batch / year</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {profile.is_currently_studying
                    ? `Expected ${profile.expected_graduation_year ?? '—'}`
                    : profile.graduation_year ?? profile.education?.graduation?.year ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Score</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {profile.graduation_score != null
                    ? `${profile.graduation_score} ${profile.graduation_score_type === 'percentage' ? '%' : 'CGPA'}`
                    : '—'}
                </dd>
              </div>
            </dl>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">10th</p>
                <p className="mt-1 text-sm text-slate-900">
                  {formatJoined([profile.education?.tenth?.marks, profile.education?.tenth?.year])}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">12th</p>
                <p className="mt-1 text-sm text-slate-900">
                  {formatJoined([profile.education?.twelfth?.marks, profile.education?.twelfth?.year])}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Diploma</p>
                <p className="mt-1 text-sm text-slate-900">
                  {formatJoined([
                    profile.education?.diploma?.branch,
                    profile.education?.diploma?.year,
                  ]) || '—'}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={HiTag}
            title="Skills"
            subtitle="Listed skills used for job matching"
          >
            {Array.isArray(profile.skills) && profile.skills.length ? (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 text-slate-800 text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No primary skills added yet.</p>
            )}
            {Array.isArray(profile.secondary_skills) && profile.secondary_skills.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Secondary</p>
                <div className="flex flex-wrap gap-2">
                  {profile.secondary_skills.map((skill) => (
                    <span key={skill} className="inline-flex px-3 py-1.5 rounded-full bg-slate-50 text-slate-700 text-sm border border-slate-200">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon={HiDocumentArrowDown}
            title="Resume"
            subtitle="Your uploaded resume for recruiters"
          >
            {resumeSignedUrl ? (
              <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg bg-slate-50 border border-slate-100">
                <HiDocumentArrowDown className="h-8 w-8 text-slate-400" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700">Current resume</p>
                  <a
                    href={resumeSignedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
                  >
                    View resume →
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No resume uploaded yet.</p>
            )}
          </SectionCard>
        </>
      ) : (
        <form onSubmit={handleSaveProfile} className="space-y-8">
          <SectionCard
            icon={HiUser}
            title="Personal information"
            subtitle="Basic details used in your applications"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="profile-fullName" className={labelClass}>Full name</label>
                <input
                  id="profile-fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="profile-email" className={labelClass}>Email</label>
                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  readOnly
                  className={inputClass + ' bg-slate-50 cursor-not-allowed text-slate-600'}
                  placeholder="you@example.com"
                />
                <p className="mt-1 text-xs text-slate-400">Email is linked to your account and cannot be changed here.</p>
              </div>
              <div>
                <label htmlFor="profile-phone" className={labelClass}>Phone</label>
                <input
                  id="profile-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <label htmlFor="profile-city" className={labelClass}>Current city</label>
                <input
                  id="profile-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="e.g. Bangalore, Hyderabad"
                />
              </div>
              <div>
                <label htmlFor="profile-country" className={labelClass}>Country</label>
                <input id="profile-country" type="text" value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass} placeholder="India" />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={willingRelocate} onChange={(e) => setWillingRelocate(e.target.checked)} className="rounded border-slate-300" />
                  Open to relocating for the right role
                </label>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={HiBriefcase} title="Career & domain" subtitle="Track, domain, and role">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer text-sm font-medium ${isFresher ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-slate-200 text-slate-700'}`}>
                  <input type="radio" name="profile-track" checked={isFresher} onChange={() => setIsFresher(true)} className="sr-only" />
                  Fresher
                </label>
                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer text-sm font-medium ${!isFresher ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-slate-200 text-slate-700'}`}>
                  <input type="radio" name="profile-track" checked={!isFresher} onChange={() => setIsFresher(false)} className="sr-only" />
                  Experienced
                </label>
              </div>
              <div className="sm:col-span-2">
                <p className={labelClass}>
                  Target domains <span className="text-slate-500 font-normal">(up to {MAX_JOB_DOMAINS})</span>
                </p>
                <p className="text-xs text-slate-500 mb-2">Pick suggestions or type your own</p>
                {jobDomains.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {jobDomains.map((domain) => (
                      <span
                        key={domain}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-sm"
                      >
                        {jobDomainLabel(domain)}
                        <button
                          type="button"
                          onClick={() => removeJobDomain(domain)}
                          className="hover:text-slate-950"
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
                        jobDomains.length >= MAX_JOB_DOMAINS
                        && !jobDomains.some((d) => domainKey(d) === domainKey(o.value))
                      }
                      className={`px-3 py-1 rounded-full text-xs font-medium border disabled:opacity-40 ${
                        jobDomains.some((d) => domainKey(d) === domainKey(o.value))
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="profile-domain-custom"
                    type="text"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomJobDomain())}
                    className={`${inputClass} min-w-0 flex-1`}
                    placeholder="Type a domain — e.g. Cloud, Cyber Security"
                    disabled={jobDomains.length >= MAX_JOB_DOMAINS}
                  />
                  <button
                    type="button"
                    onClick={addCustomJobDomain}
                    disabled={!domainInput.trim() || jobDomains.length >= MAX_JOB_DOMAINS}
                    className="w-full sm:w-auto shrink-0 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="profile-role-title" className={labelClass}>Role title</label>
                <input
                  id="profile-role-title"
                  type="text"
                  value={roleTitle}
                  onChange={(e) => {
                    setRoleTitle(e.target.value);
                    setPrimaryRole(e.target.value);
                  }}
                  className={inputClass}
                  placeholder="e.g. Frontend Developer"
                />
              </div>
              <div className="sm:col-span-2">
                  <p className={labelClass}>Specializations</p>
                  <div className="flex flex-wrap gap-2">
                    {ROLE_SPECIALIZATION_SUGGESTIONS.slice(0, 14).map((spec) => (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => setRoleSpecializations((prev) =>
                          prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec],
                        )}
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${
                          roleSpecializations.includes(spec)
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {spec}
                      </button>
                    ))}
                  </div>
                </div>
                {!isFresher && (
                  <>
                    <div>
                      <label htmlFor="profile-years" className={labelClass}>Years of experience</label>
                      <input id="profile-years" type="number" min="0" step="0.5" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="profile-ctc" className={labelClass}>Current CTC (LPA)</label>
                      <input id="profile-ctc" type="text" value={currentCtc} onChange={(e) => setCurrentCtc(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="profile-current-co" className={labelClass}>Current company</label>
                      <input id="profile-current-co" type="text" value={currentCompany} onChange={(e) => setCurrentCompany(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="profile-prev-co" className={labelClass}>Previous company</label>
                      <input id="profile-prev-co" type="text" value={previousCompany} onChange={(e) => setPreviousCompany(e.target.value)} className={inputClass} />
                    </div>
                  </>
                )}
                <div>
                  <label htmlFor="profile-employment" className={labelClass}>Employment status</label>
                  <select id="profile-employment" value={employmentStatus} onChange={(e) => setEmploymentStatus(e.target.value)} className={selectClass}>
                    {EMPLOYMENT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="profile-work-mode" className={labelClass}>Work mode</label>
                  <select id="profile-work-mode" value={workMode} onChange={(e) => setWorkMode(e.target.value)} className={selectClass}>
                    {WORK_MODE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="profile-notice" className={labelClass}>Notice period / joining</label>
                  <select
                    id="profile-notice"
                    value={noticePeriod}
                    onChange={(e) => setNoticePeriod(e.target.value)}
                    className={selectClass}
                  >
                    {NOTICE_PERIOD_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                {noticePeriod && noticePeriod !== 'immediate' && (
                  <div>
                    <label htmlFor="profile-last-day" className={labelClass}>Last working day (optional)</label>
                    <input id="profile-last-day" type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} className={inputClass} />
                  </div>
                )}
                <div>
                  <label htmlFor="profile-sal-min" className={labelClass}>Expected salary min (LPA)</label>
                  <input id="profile-sal-min" type="text" value={expectedSalaryMin} onChange={(e) => setExpectedSalaryMin(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="profile-sal-max" className={labelClass}>Expected salary max (LPA)</label>
                  <input id="profile-sal-max" type="text" value={expectedSalaryMax} onChange={(e) => setExpectedSalaryMax(e.target.value)} className={inputClass} />
                </div>
              </div>
          </SectionCard>

          <SectionCard icon={HiGlobeAlt} title="Links & bio" subtitle="LinkedIn, portfolio, and summary">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="profile-linkedin" className={labelClass}>LinkedIn</label>
                <input id="profile-linkedin" type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} className={inputClass} placeholder="https://www.linkedin.com/in/…" />
              </div>
              <div>
                <label htmlFor="profile-portfolio" className={labelClass}>Portfolio / GitHub</label>
                <input id="profile-portfolio" type="url" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} className={inputClass} placeholder="https://github.com/…" />
              </div>
              <div>
                <label htmlFor="profile-bio" className={labelClass}>About you</label>
                <textarea id="profile-bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} className={inputClass + ' resize-y'} placeholder="Brief summary…" />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={HiAcademicCap}
            title="Education"
            subtitle="Qualification, college, branch, and scores"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-qual" className={labelClass}>Highest qualification</label>
                <select
                  id="profile-qual"
                  value={highestQualification}
                  onChange={(e) => {
                    const qual = e.target.value;
                    setHighestQualification(qual);
                    if (qual !== 'other') setHighestQualificationOther('');
                    setDegreeBranch('');
                    setDegreeBranchOther('');
                  }}
                  className={selectClass}
                >
                  <option value="">Select</option>
                  {QUALIFICATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {highestQualification === 'other' && (
                <div className="sm:col-span-2">
                  <label htmlFor="profile-qual-other" className={labelClass}>Specify qualification *</label>
                  <input
                    id="profile-qual-other"
                    type="text"
                    value={highestQualificationOther}
                    onChange={(e) => setHighestQualificationOther(e.target.value)}
                    required
                    className={inputClass}
                    placeholder="e.g. B.Com, BBA"
                  />
                </div>
              )}
              <div>
                <label htmlFor="profile-branch" className={labelClass}>Branch / course *</label>
                <select
                  id="profile-branch"
                  value={degreeBranch}
                  onChange={(e) => {
                    const branch = e.target.value;
                    setDegreeBranch(branch);
                    if (branch !== 'other') setDegreeBranchOther('');
                  }}
                  className={selectClass}
                  disabled={!highestQualification}
                >
                  <option value="">{highestQualification ? 'Select branch' : 'Select qualification first'}</option>
                  {getBranchOptions(highestQualification).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {degreeBranch === 'other' && (
                <div className="sm:col-span-2">
                  <label htmlFor="profile-branch-other" className={labelClass}>Specify branch / course *</label>
                  <input
                    id="profile-branch-other"
                    type="text"
                    value={degreeBranchOther}
                    onChange={(e) => setDegreeBranchOther(e.target.value)}
                    required
                    className={inputClass}
                    placeholder="e.g. CSE, Mechanical, Electronics"
                  />
                </div>
              )}
              <div className="sm:col-span-2">
                <label htmlFor="profile-college" className={labelClass}>College name</label>
                <input id="profile-college" type="text" value={collegeName} onChange={(e) => setCollegeName(e.target.value)} className={inputClass} placeholder="College / university" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="profile-college-standing" className={labelClass}>College tier / institute</label>
                <select
                  id="profile-college-standing"
                  value={formatCollegeStandingOption(premierInstituteType, instituteTier)}
                  onChange={(e) => {
                    const { premierInstituteType: premier, instituteTier: tier } = parseCollegeStandingOption(
                      e.target.value,
                    );
                    setPremierInstituteType(premier);
                    setInstituteTier(tier);
                  }}
                  className={selectClass}
                >
                  {COLLEGE_STANDING_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="profile-score-type" className={labelClass}>Score type</label>
                <select id="profile-score-type" value={graduationScoreType} onChange={(e) => setGraduationScoreType(e.target.value)} className={selectClass}>
                  {GRADUATION_SCORE_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={isCurrentlyStudying} onChange={(e) => setIsCurrentlyStudying(e.target.checked)} className="rounded border-slate-300" />
                  Currently studying (final year)
                </label>
              </div>
              {isCurrentlyStudying ? (
                <div>
                  <label htmlFor="profile-exp-year" className={labelClass}>Expected graduation year</label>
                  <input id="profile-exp-year" type="number" min="2020" max="2035" value={expectedGraduationYear} onChange={(e) => setExpectedGraduationYear(e.target.value)} className={inputClass} />
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="profile-grad-year" className={labelClass}>Graduation year (batch)</label>
                    <input id="profile-grad-year" type="number" min="1990" max="2035" value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="profile-score" className={labelClass}>{graduationScoreType === 'percentage' ? 'Percentage' : 'CGPA'}</label>
                    <input id="profile-score" type="number" step="0.01" min="0" value={graduationScore} onChange={(e) => setGraduationScore(e.target.value)} className={inputClass} />
                  </div>
                </>
              )}
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">School records (optional)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div>
                <label className={labelClass}>10th marks</label>
                <input
                  type="text"
                  value={education.tenth.marks}
                  onChange={(e) => updateEducation('tenth', 'marks', e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 95"
                />
              </div>
              <div>
                <label className={labelClass}>10th year</label>
                <input
                  type="number"
                  min="1990"
                  max="2030"
                  value={education.tenth.year || ''}
                  onChange={(e) => updateEducation('tenth', 'year', e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 2018"
                />
              </div>
              <div>
                <label className={labelClass}>12th marks</label>
                <input
                  type="text"
                  value={education.twelfth.marks}
                  onChange={(e) => updateEducation('twelfth', 'marks', e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 92"
                />
              </div>
              <div>
                <label className={labelClass}>12th year</label>
                <input
                  type="number"
                  min="1990"
                  max="2030"
                  value={education.twelfth.year || ''}
                  onChange={(e) => updateEducation('twelfth', 'year', e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 2020"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className={labelClass}>Diploma branch</label>
                <input type="text" value={education.diploma?.branch ?? ''} onChange={(e) => updateEducation('diploma', 'branch', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Diploma year</label>
                <input type="number" min="1990" max="2030" value={education.diploma?.year || ''} onChange={(e) => updateEducation('diploma', 'year', e.target.value)} className={inputClass} />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={HiTag}
            title="Skills"
            subtitle="Add skills that match your experience (used in job matching)"
          >
            <label className={labelClass}>Your skills</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-800 text-sm font-medium"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="p-0.5 rounded hover:bg-indigo-100 text-indigo-600 transition-colors"
                    aria-label={`Remove ${skill}`}
                  >
                    <HiXMark className="h-4 w-4" />
                  </button>
                </span>
              ))}
              {skills.length === 0 && (
                <span className="text-sm text-slate-400">No skills added yet. Type below and press Enter or Add.</span>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSkill(e)}
                className={`${inputClass} min-w-0 flex-1`}
                placeholder="e.g. React, Python, SQL"
              />
              <button
                type="button"
                onClick={addSkill}
                className="w-full sm:w-auto shrink-0 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Add
              </button>
            </div>
            <div className="mt-6">
              <label className={labelClass}>Secondary skills</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {secondarySkills.map((skill) => (
                  <span key={skill} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-800 text-sm font-medium">
                    {skill}
                    <button type="button" onClick={() => removeSecondarySkill(skill)} className="p-0.5 rounded hover:bg-slate-200" aria-label={`Remove ${skill}`}>
                      <HiXMark className="h-4 w-4" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={secondarySkillInput}
                  onChange={(e) => setSecondarySkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSecondarySkill(e)}
                  className={`${inputClass} min-w-0 flex-1`}
                  placeholder="e.g. Docker, AWS"
                />
                <button type="button" onClick={addSecondarySkill} className="w-full sm:w-auto shrink-0 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50">
                  Add
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={HiDocumentArrowDown}
            title="Resume"
            subtitle="Select a new file if you want to replace your current resume."
          >
            <div className="space-y-4">
              {resumeSignedUrl ? (
                <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg bg-slate-50 border border-slate-100">
                  <HiDocumentArrowDown className="h-8 w-8 text-slate-400" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700">Current resume</p>
                    <a
                      href={resumeSignedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
                    >
                      View resume →
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No resume uploaded yet.</p>
              )}

              <div className="flex-1 min-w-0">
                <label className={labelClass}>Replace resume (PDF, DOC, DOCX)</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setResumeReplacementFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-medium file:cursor-pointer hover:file:bg-indigo-100"
                />
                {resumeReplacementFile ? (
                  <p className="mt-1.5 text-sm text-slate-500">{resumeReplacementFile.name}</p>
                ) : (
                  <p className="mt-1.5 text-xs text-slate-400">Resume will be uploaded when you click Save changes.</p>
                )}
              </div>
            </div>
          </SectionCard>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="nth-btn-primary px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {saving ? <ButtonLoader label="Saving…" /> : 'Save changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
