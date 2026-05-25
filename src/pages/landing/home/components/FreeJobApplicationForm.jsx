import { useState, useEffect } from 'react';
import {
  HiXMark,
  HiDocumentArrowUp,
  HiUser,
  HiEnvelope,
  HiPhone,
  HiBriefcase,
  HiAcademicCap,
  HiChatBubbleBottomCenterText,
  HiCheckCircle,
  HiShieldCheck,
  HiMapPin,
} from 'react-icons/hi2';
import { supabase } from '../../../../lib/supabase';

const RESUME_ACCEPT = '.pdf,.doc,.docx';
const RESUME_MAX_SIZE_MB = 5;

const inputClass =
  'w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 shadow-sm ' +
  'focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 outline-none transition-all disabled:bg-slate-100 disabled:text-slate-500';

const sectionTitleClass =
  'md:col-span-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-indigo-600 mb-1';

export default function FreeJobApplicationForm({ jobId, jobTitle, jobCompany, onClose }) {
  const [capacityClosed, setCapacityClosed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('get_public_job_lead_capacity', {
        p_job_id: jobId,
      });
      if (cancelled || error || !data?.ok) return;
      if (data.accepts_applications === false) {
        setCapacityClosed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactNumber: '',
    currentLocation: '',
    skills: [],
    track: 'fresher',
    experienceYears: '',
    previousCompany: '',
    rolePlayed: '',
    currentCtc: '',
    extraNote: '',
  });

  const [resumeFile, setResumeFile] = useState(null);
  const [skillInput, setSkillInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'extraNote') {
      const words = value.trim().split(/\s+/);
      if (words.length > 200 && value.length > formData.extraNote.length && !value.endsWith(' ')) {
        return;
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSkillAdd = (e) => {
    e.preventDefault();
    const newSkill = skillInput.trim();
    if (newSkill && !formData.skills.includes(newSkill)) {
      setFormData((prev) => ({ ...prev, skills: [...prev.skills, newSkill] }));
    }
    setSkillInput('');
  };

  const handleSkillKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleSkillAdd(e);
    }
  };

  const removeSkill = (skillToRemove) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  const getWordCount = (text) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (capacityClosed) {
      setError('Applications for this role are full. Please explore other openings.');
      return;
    }

    if (
      !formData.name ||
      !formData.email ||
      !formData.contactNumber ||
      !String(formData.currentLocation || '').trim() ||
      formData.skills.length === 0
    ) {
      setError('Please fill out all required fields (including current location) and add at least one skill.');
      return;
    }

    if (!resumeFile) {
      setError('Please upload your resume (PDF, DOC, or DOCX).');
      return;
    }

    const ext = resumeFile.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      setError('Resume must be PDF, DOC, or DOCX.');
      return;
    }

    if (resumeFile.size > RESUME_MAX_SIZE_MB * 1024 * 1024) {
      setError(`Resume must be under ${RESUME_MAX_SIZE_MB} MB.`);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.contactNumber.replace(/[^0-9]/g, ''))) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (getWordCount(formData.extraNote) > 200) {
      setError('Extra note must be under 200 words.');
      return;
    }

    setSubmitting(true);

    let resumeUrl = null;
    try {
      const storagePath = `free-leads/${crypto.randomUUID()}_${resumeFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('resumes').upload(storagePath, resumeFile, { upsert: false });
      if (uploadError) {
        setError(uploadError.message || 'Failed to upload resume. Please try again.');
        setSubmitting(false);
        return;
      }
      resumeUrl = storagePath;
    } catch (err) {
      setError(err?.message || 'Failed to upload resume.');
      setSubmitting(false);
      return;
    }

    const { data: dbData, error: dbError } = await supabase.rpc('submit_free_job_lead', {
      p_job_id: jobId,
      p_track: formData.track,
      p_name: formData.name,
      p_email: formData.email,
      p_contact_number: formData.contactNumber,
      p_skills: formData.skills.join(', '),
      p_experience_years: formData.track === 'experienced' ? formData.experienceYears : null,
      p_previous_company: formData.track === 'experienced' ? formData.previousCompany : null,
      p_role_played: formData.track === 'experienced' ? formData.rolePlayed : null,
      p_current_ctc: formData.track === 'experienced' ? formData.currentCtc : null,
      p_extra_note: formData.extraNote,
      p_current_location: String(formData.currentLocation).trim(),
      p_resume_url: resumeUrl,
    });

    setSubmitting(false);

    if (dbError) {
      setError(dbError.message || 'An error occurred while submitting your application.');
    } else if (dbData && !dbData.ok) {
      setError(dbData.error || 'Failed to submit application.');
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden overscroll-none">
        <div
          className="absolute inset-0 bg-slate-900/55 backdrop-blur-[3px]"
          aria-hidden
          onClick={onClose}
        />
        <div
          className="relative z-10 w-full max-w-md rounded-3xl bg-white p-8 md:p-10 text-center shadow-2xl shadow-indigo-950/20 ring-1 ring-slate-200/80"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
            <HiCheckCircle className="h-11 w-11" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">You&apos;re all set</h3>
          <p className="mt-2 text-sm font-medium text-indigo-600">{jobTitle}</p>
          {jobCompany ? <p className="text-xs text-slate-500 mt-0.5">{jobCompany}</p> : null}
          <p className="mt-5 text-slate-600 text-sm leading-relaxed">
            We&apos;ve received your application. Our team will review your profile and reach out if there&apos;s a strong match.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-8 w-full nth-btn-primary py-3.5 rounded-2xl font-bold text-base shadow-lg shadow-indigo-200"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 overflow-hidden overscroll-none">
      <div
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-[3px]"
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-form-title"
        className="relative z-10 flex max-h-[100dvh] sm:max-h-[92vh] w-full sm:max-w-3xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl shadow-indigo-950/15 ring-1 ring-slate-200/90"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50/60 px-6 pb-6 pt-7 md:px-8 md:pt-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-400/10 blur-2xl" />
          <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-violet-400/10 blur-2xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600/90">Apply in minutes</p>
              <h2 id="apply-form-title" className="mt-1 text-xl font-black text-slate-900 tracking-tight sm:text-2xl break-words">
                {jobTitle}
              </h2>
              {jobCompany ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                  <HiBriefcase className="h-4 w-4 shrink-0 text-indigo-500" />
                  <span className="truncate">{jobCompany}</span>
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200/80">
                  <HiShieldCheck className="h-4 w-4 text-emerald-600" />
                  Free · No account required
                </span>
                <span className="text-xs font-medium text-slate-500">Resume + contact · ~2 min</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-white/80 hover:text-slate-700 hover:shadow-sm"
              aria-label="Close"
            >
              <HiXMark className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-6 md:px-8 md:py-7">
          {capacityClosed && (
            <div className="mb-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-amber-950">
              <span className="text-lg leading-none">●</span>
              <p className="text-sm font-semibold leading-snug">
                Applications for this role are full. Please explore other openings on our jobs page.
              </p>
            </div>
          )}
          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
              {error}
            </div>
          )}

          <form id="apply-form" onSubmit={handleSubmit} className="space-y-8">
            <fieldset
              disabled={capacityClosed}
              className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 min-w-0 border-0 p-0 m-0 disabled:opacity-[0.55]"
            >
              <div className={sectionTitleClass}>
                <HiUser className="h-4 w-4 text-indigo-500" />
                Contact details
              </div>

              <div className="space-y-2">
                <label htmlFor="fj-name" className="text-sm font-bold text-slate-800">
                  Full name <span className="text-red-500">*</span>
                </label>
                <input
                  id="fj-name"
                  type="text"
                  name="name"
                  required
                  autoComplete="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="As on your resume"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="fj-email" className="text-sm font-bold text-slate-800">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <HiEnvelope className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="fj-email"
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`${inputClass} pl-11`}
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="fj-phone" className="text-sm font-bold text-slate-800">
                  Mobile number <span className="text-red-500">*</span>
                </label>
                <div className="relative max-w-md">
                  <HiPhone className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="fj-phone"
                    type="tel"
                    name="contactNumber"
                    required
                    maxLength={10}
                    autoComplete="tel"
                    inputMode="numeric"
                    value={formData.contactNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 10) handleChange({ target: { name: 'contactNumber', value: val } });
                    }}
                    className={`${inputClass} pl-11`}
                    placeholder="10-digit Indian mobile"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="fj-location" className="text-sm font-bold text-slate-800">
                  Current location <span className="text-red-500">*</span>
                </label>
                <div className="relative max-w-md">
                  <HiMapPin className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="fj-location"
                    type="text"
                    name="currentLocation"
                    required
                    autoComplete="address-level2"
                    value={formData.currentLocation}
                    onChange={handleChange}
                    className={`${inputClass} pl-11`}
                    placeholder="e.g. Hyderabad, Bengaluru"
                  />
                </div>
                <p className="text-xs font-medium text-slate-500">
                  Shown when you are shortlisted so reviewers see where you are based.
                </p>
              </div>

              <div className={`${sectionTitleClass} md:col-span-2 !mt-2 pt-6 border-t border-slate-100`}>
                <HiDocumentArrowUp className="h-4 w-4 text-indigo-500" />
                Resume &amp; skills
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-800">
                  Resume <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept={RESUME_ACCEPT}
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                  />
                  <div
                    className={`flex min-h-[6.5rem] items-center gap-4 rounded-2xl border-2 border-dashed px-5 py-4 transition-all ${
                      resumeFile
                        ? 'border-indigo-400 bg-indigo-50/50 shadow-inner'
                        : 'border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-slate-100">
                      <HiDocumentArrowUp className="h-7 w-7 text-indigo-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {resumeFile ? (
                        <>
                          <p className="truncate text-sm font-bold text-slate-900">{resumeFile.name}</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {(resumeFile.size / 1024).toFixed(1)} KB · PDF, DOC, DOCX · max {RESUME_MAX_SIZE_MB} MB
                          </p>
                          <p className="mt-0.5 text-xs text-indigo-600 font-semibold">Click to replace file</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-slate-800">Drop or tap to upload</p>
                          <p className="mt-1 text-xs text-slate-500">PDF, Word (.doc, .docx) · up to {RESUME_MAX_SIZE_MB} MB</p>
                        </>
                      )}
                    </div>
                    {resumeFile ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setResumeFile(null);
                        }}
                        className="relative z-20 shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove file"
                      >
                        <HiXMark className="h-5 w-5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="fj-skills" className="text-sm font-bold text-slate-800">
                  Key skills <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <input
                    id="fj-skills"
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleSkillKeyDown}
                    className={`${inputClass} sm:flex-1`}
                    placeholder="e.g. React - press Enter to add"
                  />
                  <button
                    type="button"
                    onClick={handleSkillAdd}
                    className="shrink-0 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-500/25 transition hover:bg-indigo-700"
                  >
                    Add skill
                  </button>
                </div>
                {formData.skills.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {formData.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50/80 px-3 py-1.5 text-sm font-semibold text-indigo-900"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="rounded-md p-0.5 text-indigo-500 transition hover:bg-indigo-200/60 hover:text-indigo-900"
                          aria-label={`Remove ${skill}`}
                        >
                          <HiXMark className="h-4 w-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-medium text-slate-500">Add at least one skill reviewers can scan quickly.</p>
                )}
              </div>

              <div className={`${sectionTitleClass} md:col-span-2 !mt-2 pt-6 border-t border-slate-100`}>
                <HiAcademicCap className="h-4 w-4 text-indigo-500" />
                Experience
              </div>

              <div className="md:col-span-2 space-y-3">
                <span className="text-sm font-bold text-slate-800">Your level <span className="text-red-500">*</span></span>
                <div className="flex p-1 bg-slate-100/80 rounded-xl relative w-full ring-1 ring-slate-200/50">
                  <label className="flex-1 cursor-pointer relative z-10 transition-colors">
                    <input
                      type="radio"
                      name="track"
                      value="fresher"
                      checked={formData.track === 'fresher'}
                      onChange={handleChange}
                      className="peer sr-only"
                    />
                    <div className="text-center py-2.5 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-700 peer-checked:text-slate-900 peer-checked:bg-white peer-checked:shadow-[0_2px_8px_rgba(0,0,0,0.06)] peer-checked:ring-1 peer-checked:ring-slate-200/50 transition-all duration-300">
                      Fresher <span className="hidden sm:inline font-medium text-slate-400 font-normal ml-1">(0–1 yr)</span>
                    </div>
                  </label>
                  <label className="flex-1 cursor-pointer relative z-10 transition-colors">
                    <input
                      type="radio"
                      name="track"
                      value="experienced"
                      checked={formData.track === 'experienced'}
                      onChange={handleChange}
                      className="peer sr-only"
                    />
                    <div className="text-center py-2.5 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-700 peer-checked:text-slate-900 peer-checked:bg-white peer-checked:shadow-[0_2px_8px_rgba(0,0,0,0.06)] peer-checked:ring-1 peer-checked:ring-slate-200/50 transition-all duration-300">
                      Experienced <span className="hidden sm:inline font-medium text-slate-400 font-normal ml-1">(1+ yrs)</span>
                    </div>
                  </label>
                </div>
              </div>

              {formData.track === 'experienced' && (
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5 rounded-2xl bg-indigo-50/40 p-5 border border-indigo-100/60 shadow-[inset_0_2px_10px_rgba(99,102,241,0.03)] transition-all duration-500">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Experience <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="experienceYears"
                      required={formData.track === 'experienced'}
                      value={formData.experienceYears}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="e.g. 3.5 years"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Current CTC <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="currentCtc"
                      required={formData.track === 'experienced'}
                      value={formData.currentCtc}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="e.g. 12 LPA"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Company <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="previousCompany"
                      required={formData.track === 'experienced'}
                      value={formData.previousCompany}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Current or last employer"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Role <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="rolePlayed"
                      required={formData.track === 'experienced'}
                      value={formData.rolePlayed}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="e.g. Frontend Engineer"
                    />
                  </div>
                </div>
              )}

              <div className={`${sectionTitleClass} md:col-span-2 !mt-2 pt-6 border-t border-slate-100`}>
                <HiChatBubbleBottomCenterText className="h-4 w-4 text-indigo-500" />
                Optional note
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <label htmlFor="fj-note" className="text-sm font-bold text-slate-800">
                    Why should we hire you?
                  </label>
                  <span
                    className={`text-xs font-semibold tabular-nums ${getWordCount(formData.extraNote) > 200 ? 'text-red-600' : 'text-slate-400'}`}
                  >
                    {getWordCount(formData.extraNote)} / 200 words
                  </span>
                </div>
                <textarea
                  id="fj-note"
                  name="extraNote"
                  rows={4}
                  value={formData.extraNote}
                  onChange={handleChange}
                  className={`${inputClass} resize-none min-h-[7rem]`}
                  placeholder="Projects, certifications, or anything that makes you stand out…"
                />
              </div>
            </fieldset>
          </form>
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-slate-50/95 px-6 py-5 md:px-8">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-center text-xs font-medium text-slate-500 sm:text-left">
              By submitting, you agree we may contact you about this role.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none rounded-xl px-5 py-3.5 text-sm font-bold text-slate-600 ring-1 ring-slate-200 bg-white transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="apply-form"
                disabled={submitting || capacityClosed}
                className="flex-1 sm:flex-none nth-btn-primary rounded-xl px-8 py-3.5 text-sm font-bold shadow-lg shadow-indigo-300/40 disabled:opacity-60 disabled:shadow-none flex items-center justify-center gap-2 min-w-[10rem]"
              >
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Sending…
                  </>
                ) : (
                  'Submit application'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
