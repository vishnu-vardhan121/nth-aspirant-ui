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
  MOBILE_VALIDATION_MESSAGE,
} from '../../../lib/aspirantProfile';

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
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
  const [currentCompany, setCurrentCompany] = useState('');
  const [previousCompany, setPreviousCompany] = useState('');
  const [workMode, setWorkMode] = useState('any');
  const [currentCtc, setCurrentCtc] = useState('');
  const [expectedSalaryMin, setExpectedSalaryMin] = useState('');
  const [expectedSalaryMax, setExpectedSalaryMax] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [willingRelocate, setWillingRelocate] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [bio, setBio] = useState('');
  const [education, setEducation] = useState(defaultEducation);
  const [skills, setSkills] = useState([]);
  const [secondarySkills, setSecondarySkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [secondarySkillInput, setSecondarySkillInput] = useState('');
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
    setCurrentCompany(f.currentCompany);
    setPreviousCompany(f.previousCompany);
    setWorkMode(f.workMode);
    setCurrentCtc(f.currentCtc);
    setExpectedSalaryMin(f.expectedSalaryMin);
    setExpectedSalaryMax(f.expectedSalaryMax);
    setAvailableFrom(f.availableFrom);
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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    if (!user?.id || !profile) return;
    if (phone.trim() && !isValidMobileNumber(phone)) {
      setMessage({ type: 'error', text: MOBILE_VALIDATION_MESSAGE });
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
        currentCompany,
        previousCompany,
        workMode,
        currentCtc,
        expectedSalaryMin,
        expectedSalaryMax,
        availableFrom,
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
          <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isEditMode
              ? 'Update your details below and save your changes.'
              : 'Review your profile details. Edit only when you need to make changes.'}
          </p>
        </div>
        <button
          type="button"
          onClick={isEditMode ? cancelEditing : startEditing}
          className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
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
                <dt className="text-slate-500">Track</dt>
                <dd className="mt-1 font-medium text-slate-900 capitalize">{profile.track || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Target role</dt>
                <dd className="mt-1 font-medium text-slate-900">{profile.primary_role || '—'}</dd>
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
                <dt className="text-slate-500">Expected salary</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {formatJoined([
                    profile.expected_salary_min && `${profile.expected_salary_min} LPA`,
                    profile.expected_salary_max && `${profile.expected_salary_max} LPA`,
                  ]).replace(' • ', ' – ') || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Available from</dt>
                <dd className="mt-1 font-medium text-slate-900">{profile.available_from || '—'}</dd>
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
            subtitle="10th, 12th, and graduation details"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Graduation</p>
                <p className="mt-1 text-sm text-slate-900">
                  {formatJoined([
                    profile.education?.graduation?.type,
                    profile.education?.graduation?.branch,
                    profile.education?.graduation?.year,
                  ])}
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

          <SectionCard icon={HiBriefcase} title="Experience & role" subtitle="Track, role, and compensation">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="profile-role" className={labelClass}>Target role</label>
                  <input id="profile-role" type="text" value={primaryRole} onChange={(e) => setPrimaryRole(e.target.value)} className={inputClass} placeholder="e.g. Full Stack Developer" />
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
                  <label htmlFor="profile-sal-min" className={labelClass}>Expected salary min (LPA)</label>
                  <input id="profile-sal-min" type="text" value={expectedSalaryMin} onChange={(e) => setExpectedSalaryMin(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="profile-sal-max" className={labelClass}>Expected salary max (LPA)</label>
                  <input id="profile-sal-max" type="text" value={expectedSalaryMax} onChange={(e) => setExpectedSalaryMax(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="profile-available" className={labelClass}>Available from</label>
                  <input id="profile-available" type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} className={inputClass} />
                </div>
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
            subtitle="10th, 12th, and graduation details"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div>
                <label className={labelClass}>Graduation type</label>
                <input
                  type="text"
                  value={education.graduation.type}
                  onChange={(e) => updateEducation('graduation', 'type', e.target.value)}
                  className={inputClass}
                  placeholder="e.g. B.Tech, BCA"
                />
              </div>
              <div>
                <label className={labelClass}>Year</label>
                <input
                  type="number"
                  min="1990"
                  max="2030"
                  value={education.graduation.year || ''}
                  onChange={(e) => updateEducation('graduation', 'year', e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 2024"
                />
              </div>
              <div>
                <label className={labelClass}>Branch</label>
                <input
                  type="text"
                  value={education.graduation.branch}
                  onChange={(e) => updateEducation('graduation', 'branch', e.target.value)}
                  className={inputClass}
                  placeholder="e.g. CSE"
                />
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
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSkill(e)}
                className={inputClass}
                placeholder="e.g. React, Python, SQL"
              />
              <button
                type="button"
                onClick={addSkill}
                className="shrink-0 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors"
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
              <div className="flex gap-2">
                <input
                  type="text"
                  value={secondarySkillInput}
                  onChange={(e) => setSecondarySkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSecondarySkill(e)}
                  className={inputClass}
                  placeholder="e.g. Docker, AWS"
                />
                <button type="button" onClick={addSecondarySkill} className="shrink-0 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50">
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
