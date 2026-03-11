import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { setAspirantProfile } from '../../store/slices/aspirantSlice';
import Navbar from '../../components/Navbar';
import { supabase } from '../../lib/supabase';
import { ButtonLoader } from '../../components/ui/Loader';
import { HiXMark } from 'react-icons/hi2';

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--nth-primary))] focus:border-transparent';
const labelClass = 'block text-sm font-medium text-slate-300 mb-2';

const defaultEducation = {
  tenth: { marks: '', year: '' },
  twelfth: { marks: '', year: '' },
  graduation: { type: '', year: '', branch: '' },
};

export default function OnboardingPage() {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [education, setEducation] = useState(defaultEducation);
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [resumeFile, setResumeFile] = useState(null);

  useEffect(() => {
    if (user) setEmail(user.email ?? '');
  }, [user]);

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

  const updateEducation = (level, field, value) => {
    setEducation((prev) => ({
      ...prev,
      [level]: { ...prev[level], [field]: value },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    if (!user?.id) return;
    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      setMessage({ type: 'error', text: 'Session expired. Please sign in again.' });
      setSubmitting(false);
      return;
    }

    const payload = {
      id: session.user.id,
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      city: city.trim(),
      education: {
        tenth: {
          marks: String(education.tenth.marks).trim(),
          year: education.tenth.year ? Number(education.tenth.year) : null,
        },
        twelfth: {
          marks: String(education.twelfth.marks).trim(),
          year: education.twelfth.year ? Number(education.twelfth.year) : null,
        },
        graduation: {
          type: String(education.graduation.type).trim() || null,
          year: education.graduation.year ? Number(education.graduation.year) : null,
          branch: String(education.graduation.branch).trim() || null,
        },
      },
      skills: skills.length ? skills : [],
    };

    if (resumeFile) {
      const ext = resumeFile.name.split('.').pop()?.toLowerCase() || 'pdf';
      const storagePath = `${session.user.id}/resume.${ext}`;
      const { error: uploadError } = await supabase.storage.from('resumes').upload(storagePath, resumeFile, { upsert: true });
      if (uploadError) {
        setMessage({ type: 'error', text: uploadError.message ?? 'Failed to upload resume.' });
        setSubmitting(false);
        return;
      }
      payload.resume_url = storagePath;
    }

    const { data, error } = await supabase.from('aspirants').upsert(payload, { onConflict: 'id' }).select().single();

    if (error) {
      setMessage({ type: 'error', text: error.message ?? 'Failed to save profile.' });
      setSubmitting(false);
      return;
    }
    dispatch(setAspirantProfile(data ?? payload));
    navigate('/dashboard', { replace: true });
    setSubmitting(false);
  };

  if (!user) return null;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'rgb(var(--nth-bg-dark))' }}
    >
      <Navbar />
      <div className="flex-1 flex flex-col items-center px-6 pt-24 pb-12">
        <div className="w-full max-w-lg">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
            Complete your profile
          </h1>
          <p className="text-slate-400 text-sm mb-8">
            We&apos;ll use this to match you with opportunities. You can add a resume now or later from your profile.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="fullName" className={labelClass}>Full name</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className={inputClass}
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="email" className={labelClass}>Email</label>
              <input
                id="email"
                type="email"
                value={email}
                readOnly
                className={inputClass + ' opacity-80 cursor-not-allowed'}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="phone" className={labelClass}>Phone</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label htmlFor="city" className={labelClass}>Current city</label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className={inputClass}
                placeholder="e.g. Bangalore"
              />
            </div>

            <div>
              <label className={labelClass}>Resume (optional)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white/10 file:text-white file:font-medium hover:file:bg-white/15"
              />
              {resumeFile && (
                <p className="mt-1 text-sm text-slate-500">{resumeFile.name}</p>
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Education</h2>
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Skills</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-slate-200 text-sm"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="hover:text-white"
                      aria-label={`Remove ${skill}`}
                    >
                      <HiXMark className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSkill(e)}
                  className={inputClass}
                  placeholder="Add a skill and press Enter"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white font-medium hover:bg-white/15 whitespace-nowrap"
                >
                  Add
                </button>
              </div>
            </div>

            {message.text && (
              <div
                className={`rounded-lg px-4 py-3 text-sm ${
                  message.type === 'error'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="nth-btn-primary w-full py-3 rounded-xl text-base font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? <ButtonLoader label="Saving…" /> : 'Save & continue'}
            </button>
          </form>

          <p className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-sm text-slate-500 hover:text-slate-400"
            >
              Skip for now →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
