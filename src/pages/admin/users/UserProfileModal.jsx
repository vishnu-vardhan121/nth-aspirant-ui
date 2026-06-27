import { useState, useEffect } from 'react';
import {
  HiXMark,
  HiUser,
  HiAcademicCap,
  HiTag,
  HiDocumentArrowDown,
  HiBriefcase,
  HiClipboardDocumentCheck,
} from 'react-icons/hi2';
import { supabase } from '../../../lib/supabase';
import { Loader, LoaderPulse } from '../../../components/ui/Loader';
import {
  jobDomainLabel,
  jobDomainsLabel,
  qualificationLabel,
  branchLabel,
  communicationLabel,
  noticePeriodLabel,
  instituteTierLabel,
  premierInstituteLabel,
  isPremierInstituteSelection,
} from '../../../lib/aspirantFilterOptions';
import ProfileSection from './ProfileSection';
import { formatDate, mockStatusBadgeClass, mockStatusLabel } from './formatters';

export default function UserProfileModal({ aspirantId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [resumeSignedUrl, setResumeSignedUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!aspirantId) return;
    setLoading(true);
    setProfile(null);
    setResumeSignedUrl(null);
    (async () => {
      const { data, error } = await supabase.rpc('get_aspirant_profile_for_admin', { p_aspirant_id: aspirantId });
      if (!error && data) setProfile(typeof data === 'string' ? JSON.parse(data) : data);
      setLoading(false);
    })();
  }, [aspirantId]);

  useEffect(() => {
    if (!profile?.resume_url) {
      setResumeSignedUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.storage.from('resumes').createSignedUrl(profile.resume_url, 3600);
      if (!cancelled && !error && data?.signedUrl) setResumeSignedUrl(data.signedUrl);
    })();
    return () => { cancelled = true; };
  }, [profile?.resume_url]);

  if (!aspirantId) return null;

  const edu = profile?.education || {};
  const skills = Array.isArray(profile?.skills) ? profile.skills : [];
  const secondarySkills = Array.isArray(profile?.secondary_skills) ? profile.secondary_skills : [];
  const roleSpecs = Array.isArray(profile?.role_specializations) ? profile.role_specializations : [];
  const mocks = Array.isArray(profile?.mocks) ? profile.mocks : [];
  const mockSummary = profile?.mock_summary || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60" aria-hidden onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{profile?.full_name ?? 'User profile'}</h2>
            {profile?.email && <p className="text-sm text-slate-500">{profile.email}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close">
            <HiXMark className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <LoaderPulse size="md" /> Loading…
            </div>
          ) : !profile ? (
            <p className="text-slate-500 text-sm">Could not load profile.</p>
          ) : (
            <div className="space-y-8">
              <ProfileSection icon={HiUser} title="Contact & career">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div><dt className="text-slate-500">Phone</dt><dd className="font-medium text-slate-900">{profile.phone || '—'}</dd></div>
                  <div><dt className="text-slate-500">City</dt><dd className="font-medium text-slate-900">{profile.city ?? '—'}{profile.country ? `, ${profile.country}` : ''}</dd></div>
                  <div><dt className="text-slate-500">Track</dt><dd className="font-medium text-slate-900 capitalize">{profile.track ?? '—'}</dd></div>
                  <div><dt className="text-slate-500">Role</dt><dd className="font-medium text-slate-900">{profile.role_title ?? profile.primary_role ?? '—'}</dd></div>
                  <div>
                    <dt className="text-slate-500">Target domains</dt>
                    <dd className="font-medium text-slate-900">
                      {jobDomainsLabel(profile.job_domains) !== '—' ? jobDomainsLabel(profile.job_domains) : jobDomainLabel(profile.job_domain)}
                    </dd>
                  </div>
                  <div><dt className="text-slate-500">Notice period</dt><dd className="font-medium text-slate-900">{noticePeriodLabel(profile.notice_period)}</dd></div>
                  {profile.available_from && profile.notice_period !== 'immediate' && (
                    <div><dt className="text-slate-500">Last working day</dt><dd className="font-medium text-slate-900">{formatDate(profile.available_from)}</dd></div>
                  )}
                  <div><dt className="text-slate-500">Communication (profile)</dt><dd className="font-medium text-slate-900">{communicationLabel(profile.communication_level)}</dd></div>
                  <div><dt className="text-slate-500">Relocate</dt><dd className="font-medium text-slate-900">{profile.willing_relocate ? 'Yes' : 'No'}</dd></div>
                  {profile.track === 'experienced' && (
                    <>
                      <div><dt className="text-slate-500">Experience</dt><dd className="font-medium text-slate-900">{profile.experience_years != null ? `${profile.experience_years} years` : '—'}</dd></div>
                      <div><dt className="text-slate-500">Current company</dt><dd className="font-medium text-slate-900">{profile.current_company || '—'}</dd></div>
                      <div><dt className="text-slate-500">Work mode</dt><dd className="font-medium text-slate-900 capitalize">{profile.work_mode || '—'}</dd></div>
                      <div>
                        <dt className="text-slate-500">CTC / expected</dt>
                        <dd className="font-medium text-slate-900">{[profile.current_ctc, profile.expected_salary_min, profile.expected_salary_max].filter(Boolean).join(' · ') || '—'}</dd>
                      </div>
                    </>
                  )}
                </dl>
              </ProfileSection>

              <ProfileSection icon={HiAcademicCap} title="Education">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm mb-4">
                  <div>
                    <dt className="text-slate-500">Qualification</dt>
                    <dd className="font-medium text-slate-900">
                      {profile.highest_qualification === 'other' ? (edu.graduation?.type || 'Other') : qualificationLabel(profile.highest_qualification)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Branch</dt>
                    <dd className="font-medium text-slate-900">
                      {branchLabel(profile.highest_qualification, profile.degree_branch, profile.degree_branch_other) || edu.graduation?.branch || '—'}
                    </dd>
                  </div>
                  <div className="sm:col-span-2"><dt className="text-slate-500">College</dt><dd className="font-medium text-slate-900">{profile.college_name || '—'}</dd></div>
                  <div>
                    <dt className="text-slate-500">Premier institute</dt>
                    <dd className="font-medium text-slate-900">
                      {premierInstituteLabel(profile.premier_institute_type)}
                      {isPremierInstituteSelection(profile.premier_institute_type) && profile.institute_tier && profile.institute_tier !== 'unrated'
                        ? ` · ${instituteTierLabel(profile.institute_tier)}` : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Batch / score</dt>
                    <dd className="font-medium text-slate-900">
                      {profile.is_currently_studying ? `Expected ${profile.expected_graduation_year ?? '—'}` : profile.graduation_year ?? edu.graduation?.year ?? '—'}
                      {profile.graduation_score != null ? ` · ${profile.graduation_score}${profile.graduation_score_type === 'percentage' ? '%' : ' CGPA'}` : ''}
                    </dd>
                  </div>
                </dl>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {edu.tenth?.marks || edu.tenth?.year ? (
                    <div className="p-3 rounded-lg bg-slate-50 text-sm"><p className="text-xs font-medium text-slate-500 uppercase">10th</p><p className="mt-1">{[edu.tenth.marks, edu.tenth.year].filter(Boolean).join(' · ')}</p></div>
                  ) : null}
                  {edu.twelfth?.marks || edu.twelfth?.year ? (
                    <div className="p-3 rounded-lg bg-slate-50 text-sm"><p className="text-xs font-medium text-slate-500 uppercase">12th</p><p className="mt-1">{[edu.twelfth.marks, edu.twelfth.year].filter(Boolean).join(' · ')}</p></div>
                  ) : null}
                  {edu.diploma?.branch || edu.diploma?.year ? (
                    <div className="p-3 rounded-lg bg-slate-50 text-sm"><p className="text-xs font-medium text-slate-500 uppercase">Diploma</p><p className="mt-1">{[edu.diploma.branch, edu.diploma.year].filter(Boolean).join(' · ')}</p></div>
                  ) : null}
                </div>
              </ProfileSection>

              <ProfileSection icon={HiTag} title="Skills">
                <SkillGroup label="Primary" items={skills} chipClass="bg-indigo-50 text-indigo-800" />
                <SkillGroup label="Secondary" items={secondarySkills} chipClass="bg-slate-100 text-slate-700" />
                <SkillGroup label="Specializations" items={roleSpecs} chipClass="bg-violet-50 text-violet-800" />
              </ProfileSection>

              {(profile.linkedin_url || profile.portfolio_url || profile.bio) && (
                <ProfileSection icon={HiBriefcase} title="Links & bio">
                  <dl className="space-y-2 text-sm">
                    {profile.linkedin_url && (
                      <div><dt className="text-slate-500">LinkedIn</dt><dd><a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all">{profile.linkedin_url}</a></dd></div>
                    )}
                    {profile.portfolio_url && (
                      <div><dt className="text-slate-500">Portfolio</dt><dd><a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all">{profile.portfolio_url}</a></dd></div>
                    )}
                    {profile.bio && <div><dt className="text-slate-500">About</dt><dd className="text-slate-900 whitespace-pre-wrap">{profile.bio}</dd></div>}
                  </dl>
                </ProfileSection>
              )}

              <ProfileSection icon={HiClipboardDocumentCheck} title="Plan & mocks">
                <MockSummaryCards profile={profile} mockSummary={mockSummary} />
                <MockHistoryList mocks={mocks} />
              </ProfileSection>

              <ProfileSection icon={HiDocumentArrowDown} title="Resume">
                {profile.resume_url ? (
                  <div className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 bg-slate-50">
                    <HiDocumentArrowDown className="h-8 w-8 text-slate-400 shrink-0" />
                    {resumeSignedUrl ? (
                      <a href={resumeSignedUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-medium hover:underline">View / download resume →</a>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-slate-500 text-sm"><Loader size="xs" /> Loading link…</span>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">No resume uploaded.</p>
                )}
              </ProfileSection>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SkillGroup({ label, items, chipClass }) {
  if (!items.length) return null;
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-xs font-medium text-slate-500 uppercase mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((s) => (
          <span key={s} className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${chipClass}`}>{s}</span>
        ))}
      </div>
    </div>
  );
}

function MockSummaryCards({ profile, mockSummary }) {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <SummaryCard label="Plan" value={profile.plan ?? '—'} sub={profile.is_active ? 'Active' : 'Expired'} />
        <SummaryCard label="Mocks this period" value={`${mockSummary.mocks_conducted_in_period ?? 0} / ${mockSummary.mock_limit ?? profile.mock_limit ?? 0}`} />
        <SummaryCard label="Completed (all time)" value={mockSummary.completed_total ?? 0} />
        <SummaryCard
          label="Latest scores"
          value={mockSummary.latest_overall != null ? `O:${mockSummary.latest_overall} C:${mockSummary.latest_communication ?? '—'} T:${mockSummary.latest_technical ?? '—'}` : '—'}
          small
        />
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Scheduled: {mockSummary.scheduled_count ?? 0} · Requested: {mockSummary.requested_count ?? 0}
        {mockSummary.latest_completed_at ? ` · Last completed ${formatDate(mockSummary.latest_completed_at)}` : ''}
      </p>
    </>
  );
}

function SummaryCard({ label, value, sub, small }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`font-semibold text-slate-900 ${small ? 'text-xs leading-relaxed' : ''}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function MockHistoryList({ mocks }) {
  if (!mocks.length) return <p className="text-slate-500 text-sm">No mock registrations yet.</p>;
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {mocks.map((m) => (
        <div key={m.id} className="rounded-lg border border-slate-200 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${mockStatusBadgeClass(m.status)}`}>{mockStatusLabel(m.status)}</span>
            <span className="text-xs text-slate-500">{formatDate(m.completed_at || m.scheduled_at || m.created_at)}</span>
          </div>
          {m.status === 'completed' && (
            <p className="mt-2 text-slate-700">
              Overall <strong>{m.overall_score ?? '—'}</strong>
              {' · '}Comm <strong>{m.communication_score ?? '—'}</strong>
              {' · '}Tech <strong>{m.technical_score ?? '—'}</strong>
              {m.interviewer_name ? ` · ${m.interviewer_name}` : ''}
            </p>
          )}
          {m.feedback_notes && <p className="mt-2 text-slate-600 text-xs whitespace-pre-wrap line-clamp-3">{m.feedback_notes}</p>}
          {Array.isArray(m.tech_feedback?.areas) && m.tech_feedback.areas.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {m.tech_feedback.areas.map((area, idx) => (
                <span key={idx} className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-800">{area.label}: {area.score}/10</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
