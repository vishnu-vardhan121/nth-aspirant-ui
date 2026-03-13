import { useState, useEffect } from 'react';
import { HiXMark, HiDocumentArrowUp } from 'react-icons/hi2';
import { supabase } from '../../../../lib/supabase';

const RESUME_ACCEPT = '.pdf,.doc,.docx';
const RESUME_MAX_SIZE_MB = 5;

export default function FreeJobApplicationForm({ jobId, jobTitle, onClose }) {
  // Lock body scroll when modal is open so the page behind doesn't scroll
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    // Avoid layout shift when scrollbar disappears
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
    skills: [],
    track: 'fresher', // fresher or experienced
    experienceYears: '',
    previousCompany: '',
    rolePlayed: '',
    currentCtc: '',
    extraNote: ''
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
        // Prevent typing more if word limit is reached
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSkillAdd = (e) => {
    e.preventDefault();
    const newSkill = skillInput.trim();
    if (newSkill && !formData.skills.includes(newSkill)) {
      setFormData(prev => ({ ...prev, skills: [...prev.skills, newSkill] }));
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
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove)
    }));
  };

  const getWordCount = (text) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!formData.name || !formData.email || !formData.contactNumber || formData.skills.length === 0) {
      setError('Please fill out all required fields and add at least one skill.');
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
      p_resume_url: resumeUrl
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
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          aria-hidden
          onClick={onClose}
        />
        <div
          className="relative z-10 bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h3>
          <p className="text-slate-600 mb-8">
            Thank you for applying to <strong>{jobTitle}</strong>. Our recruiting team will review your profile and reach out if there's a match.
          </p>
          <button
            onClick={onClose}
            className="w-full nth-btn-primary py-3 rounded-xl font-bold"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden overscroll-none">
      {/* Backdrop: fixed full viewport, never scrolls */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />
      {/* Modal panel: only this area scrolls; min-h-0 lets flex child shrink for overflow-y-auto */}
      <div
        className="relative z-10 bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Apply for Role</h2>
            <p className="text-slate-500 text-sm mt-1">{jobTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <HiXMark className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body — sole scroll region; overscroll-contain prevents scroll chaining to body */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0 overscroll-contain">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          <form id="apply-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-slate-900 outline-none"
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-slate-900 outline-none"
                  placeholder="john@example.com"
                />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-bold text-slate-700">Mobile Number *</label>
                <input
                  type="tel"
                  name="contactNumber"
                  required
                  maxLength={10}
                  value={formData.contactNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, ''); // Allow only numbers
                    if (val.length <= 10) handleChange({ target: { name: 'contactNumber', value: val } });
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-slate-900 outline-none"
                  placeholder="10-digit mobile number"
                />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-bold text-slate-700">Resume *</label>
                <div className="relative">
                  <input
                    type="file"
                    accept={RESUME_ACCEPT}
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed transition-colors ${
                    resumeFile ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}>
                    <HiDocumentArrowUp className="w-8 h-8 text-indigo-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      {resumeFile ? (
                        <>
                          <p className="text-sm font-medium text-slate-800 truncate">{resumeFile.name}</p>
                          <p className="text-xs text-slate-500">{(resumeFile.size / 1024).toFixed(1)} KB • Click to change</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-slate-600">PDF, DOC, or DOCX (max {RESUME_MAX_SIZE_MB} MB)</p>
                          <p className="text-xs text-slate-500">Click to upload your resume</p>
                        </>
                      )}
                    </div>
                    {resumeFile && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setResumeFile(null); }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0"
                      >
                        <HiXMark className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-bold text-slate-700">Key Skills *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleSkillKeyDown}
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-slate-900 outline-none"
                    placeholder="Type a skill and press Enter"
                  />
                  <button
                    type="button"
                    onClick={handleSkillAdd}
                    className="px-6 py-3 rounded-xl bg-indigo-100 text-indigo-700 font-bold hover:bg-indigo-200 transition-colors shrink-0"
                  >
                    Add
                  </button>
                </div>
                {formData.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-2">
                    {formData.skills.map(skill => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium border border-indigo-100"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="hover:text-indigo-900 hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                        >
                          <HiXMark className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Experience Track Toggle */}
              <div className="col-span-1 md:col-span-2 space-y-3 pt-4 border-t border-slate-100">
                <label className="text-sm font-bold text-slate-700">Your Experience Level</label>
                <div className="flex gap-4">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="radio"
                      name="track"
                      value="fresher"
                      checked={formData.track === 'fresher'}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="p-4 rounded-xl border-2 border-slate-100 peer-checked:border-indigo-500 peer-checked:bg-indigo-50 bg-white text-center transition-all">
                      <span className="font-bold peer-checked:text-indigo-700 text-slate-600 block">Fresher</span>
                      <span className="text-xs text-slate-500 mt-1 block">0-1 years of experience</span>
                    </div>
                  </label>
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="radio"
                      name="track"
                      value="experienced"
                      checked={formData.track === 'experienced'}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="p-4 rounded-xl border-2 border-slate-100 peer-checked:border-indigo-500 peer-checked:bg-indigo-50 bg-white text-center transition-all">
                      <span className="font-bold peer-checked:text-indigo-700 text-slate-600 block">Experienced</span>
                      <span className="text-xs text-slate-500 mt-1 block">1+ years of experience</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Experienced Fields */}
              {formData.track === 'experienced' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Total Experience (Years)</label>
                    <input
                      type="text"
                      name="experienceYears"
                      required={formData.track === 'experienced'}
                      value={formData.experienceYears}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-slate-900 outline-none"
                      placeholder="e.g. 3.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Current CTC</label>
                    <input
                      type="text"
                      name="currentCtc"
                      required={formData.track === 'experienced'}
                      value={formData.currentCtc}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-slate-900 outline-none"
                      placeholder="e.g. 12 LPA"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Previous/Current Company</label>
                    <input
                      type="text"
                      name="previousCompany"
                      required={formData.track === 'experienced'}
                      value={formData.previousCompany}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-slate-900 outline-none"
                      placeholder="e.g. Acme Corp"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Role Played</label>
                    <input
                      type="text"
                      name="rolePlayed"
                      required={formData.track === 'experienced'}
                      value={formData.rolePlayed}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-slate-900 outline-none"
                      placeholder="e.g. Frontend Engineer"
                    />
                  </div>
                </>
              )}

              {/* Extra Note */}
              <div className="space-y-2 md:col-span-2 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-end mb-1">
                  <label className="text-sm font-bold text-slate-700">Why should we hire you? (Optional)</label>
                  <span className={`text-xs font-medium ${getWordCount(formData.extraNote) > 200 ? 'text-red-500' : 'text-slate-500'}`}>
                    {getWordCount(formData.extraNote)} / 200 words
                  </span>
                </div>
                <textarea
                  name="extraNote"
                  rows="4"
                  value={formData.extraNote}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-slate-900 outline-none resize-none"
                  placeholder="Share any additional context about your profile or projects..."
                />
              </div>

            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl shrink-0 flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="apply-form"
            disabled={submitting}
            className="nth-btn-primary px-8 py-3 rounded-xl font-bold disabled:opacity-70 flex items-center gap-2 shadow-lg shadow-indigo-200"
          >
            {submitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : (
              'Submit Application'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
