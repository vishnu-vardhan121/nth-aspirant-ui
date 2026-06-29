import { useEffect, useState } from 'react';
import {
  HiXMark,
  HiUser,
  HiAcademicCap,
  HiTag,
  HiDocumentArrowDown,
  HiBriefcase,
  HiClipboardDocumentCheck,
  HiChatBubbleBottomCenterText,
} from 'react-icons/hi2';
import { Loader, LoaderPulse } from '../ui/Loader';
import ProfileSection from '../../pages/admin/users/ProfileSection';
import { formatDate, mockStatusBadgeClass, mockStatusLabel } from '../../pages/admin/users/formatters';
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
} from '../../lib/aspirantFilterOptions';
import {
  fetchInterviewerCandidateProfile,
  fetchInterviewerResumeSignedUrl,
} from '../../lib/interviewerCandidateProfile';
import { getTechFeedbackAreas, getMockRatingLabel } from '../../lib/mockFeedback';

export default function InterviewerCandidateProfileModal({ mockRegistrationId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [resumeSignedUrl, setResumeSignedUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!mockRegistrationId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    setProfile(null);
    setResumeSignedUrl(null);

    (async () => {
      try {
        const data = await fetchInterviewerCandidateProfile(mockRegistrationId);
        if (cancelled) return;
        setProfile(data);
        if (data.resume_url) {
          const url = await fetchInterviewerResumeSignedUrl(data.resume_url);
          if (!cancelled) setResumeSignedUrl(url);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mockRegistrationId]);

  useEffect(() => {
    if (!mockRegistrationId) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mockRegistrationId, onClose]);

  if (!mockRegistrationId) return null;

  const edu = profile?.education || {};
  const skills = Array.isArray(profile?.skills) ? profile.skills : [];
  const secondarySkills = Array.isArray(profile?.secondary_skills) ? profile.secondary_skills : [];
  const roleSpecs = Array.isArray(profile?.role_specializations) ? profile.role_specializations : [];
  const mocks = Array.isArray(profile?.mocks) ? profile.mocks : [];
  const mockSummary = profile?.mock_summary || {};
  const currentMock = profile?.current_mock || {};
  const availabilityNotes = currentMock.availability_notes?.trim();

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60" aria-hidden onClick={onClose} />
      <div
        className="relative flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="interviewer-candidate-profile-title"
      >
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Candidate profile</p>
            <h2 id="interviewer-candidate-profile-title" className="truncate text-lg font-semibold text-slate-900">
              {profile?.full_name ?? 'Loading…'}
            </h2>
            {profile?.email ? <p className="truncate text-sm text-slate-500">{profile.email}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <LoaderPulse size="md" /> Loading candidate details…
            </div>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : !profile ? (
            <p className="text-sm text-slate-500">Could not load profile.</p>
          ) : (
            <div className="space-y-8">
              {availabilityNotes ? (
                <ProfileSection icon={HiChatBubbleBottomCenterText} title="Notes for this mock">
                  <p className="rounded-lg border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm whitespace-pre-wrap text-slate-800">
                    {availabilityNotes}
                  </p>
                </ProfileSection>
              ) : null}

              <ProfileSection icon={HiDocumentArrowDown} title="Resume">
                {profile.resume_url ? (
                  <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <HiDocumentArrowDown className="h-8 w-8 shrink-0 text-slate-400" />
                    {resumeSignedUrl ? (
                      <a
                        href={resumeSignedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        View / download resume →
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-sm text-slate-500">
                        <Loader size="xs" /> Loading link…
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No resume uploaded.</p>
                )}
              </ProfileSection>

              <ProfileSection icon={HiUser} title="Contact & career">
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">Phone</dt>
                    <dd className="font-medium text-slate-900">{profile.phone || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">City</dt>
                    <dd className="font-medium text-slate-900">
                      {profile.city ?? '—'}
                      {profile.country ? `, ${profile.country}` : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Track</dt>
                    <dd className="font-medium capitalize text-slate-900">{profile.track ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Role</dt>
                    <dd className="font-medium text-slate-900">{profile.role_title ?? profile.primary_role ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Target domains</dt>
                    <dd className="font-medium text-slate-900">
                      {jobDomainsLabel(profile.job_domains) !== '—'
                        ? jobDomainsLabel(profile.job_domains)
                        : jobDomainLabel(profile.job_domain)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Communication</dt>
                    <dd className="font-medium text-slate-900">{communicationLabel(profile.communication_level)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Notice period</dt>
                    <dd className="font-medium text-slate-900">{noticePeriodLabel(profile.notice_period)}</dd>
                  </div>
                  {profile.track === 'experienced' ? (
                    <>
                      <div>
                        <dt className="text-slate-500">Experience</dt>
                        <dd className="font-medium text-slate-900">
                          {profile.experience_years != null ? `${profile.experience_years} years` : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Current company</dt>
                        <dd className="font-medium text-slate-900">{profile.current_company || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Work mode</dt>
                        <dd className="font-medium capitalize text-slate-900">{profile.work_mode || '—'}</dd>
                      </div>
                    </>
                  ) : null}
                </dl>
              </ProfileSection>

              <ProfileSection icon={HiAcademicCap} title="Education">
                <dl className="mb-4 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">Qualification</dt>
                    <dd className="font-medium text-slate-900">
                      {profile.highest_qualification === 'other'
                        ? edu.graduation?.type || 'Other'
                        : qualificationLabel(profile.highest_qualification)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Branch</dt>
                    <dd className="font-medium text-slate-900">
                      {branchLabel(profile.highest_qualification, profile.degree_branch, profile.degree_branch_other) ||
                        edu.graduation?.branch ||
                        '—'}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-slate-500">College</dt>
                    <dd className="font-medium text-slate-900">{profile.college_name || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Premier institute</dt>
                    <dd className="font-medium text-slate-900">
                      {premierInstituteLabel(profile.premier_institute_type)}
                      {isPremierInstituteSelection(profile.premier_institute_type) &&
                      profile.institute_tier &&
                      profile.institute_tier !== 'unrated'
                        ? ` · ${instituteTierLabel(profile.institute_tier)}`
                        : ''}
                    </dd>
                  </div>
                </dl>
              </ProfileSection>

              <ProfileSection icon={HiTag} title="Skills">
                <SkillGroup label="Primary" items={skills} chipClass="bg-indigo-50 text-indigo-800" />
                <SkillGroup label="Secondary" items={secondarySkills} chipClass="bg-slate-100 text-slate-700" />
                <SkillGroup label="Specializations" items={roleSpecs} chipClass="bg-violet-50 text-violet-800" />
              </ProfileSection>

              {(profile.linkedin_url || profile.portfolio_url || profile.bio) && (
                <ProfileSection icon={HiBriefcase} title="Links & bio">
                  <dl className="space-y-2 text-sm">
                    {profile.linkedin_url ? (
                      <div>
                        <dt className="text-slate-500">LinkedIn</dt>
                        <dd>
                          <a
                            href={profile.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all text-indigo-600 hover:underline"
                          >
                            {profile.linkedin_url}
                          </a>
                        </dd>
                      </div>
                    ) : null}
                    {profile.portfolio_url ? (
                      <div>
                        <dt className="text-slate-500">Portfolio</dt>
                        <dd>
                          <a
                            href={profile.portfolio_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all text-indigo-600 hover:underline"
                          >
                            {profile.portfolio_url}
                          </a>
                        </dd>
                      </div>
                    ) : null}
                    {profile.bio ? (
                      <div>
                        <dt className="text-slate-500">About</dt>
                        <dd className="whitespace-pre-wrap text-slate-900">{profile.bio}</dd>
                      </div>
                    ) : null}
                  </dl>
                </ProfileSection>
              )}

              <ProfileSection icon={HiClipboardDocumentCheck} title="Previous mocks">
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <SummaryCard label="Completed" value={mockSummary.completed_total ?? 0} />
                  <SummaryCard label="Scheduled" value={mockSummary.scheduled_count ?? 0} />
                  <SummaryCard
                    label="Latest scores"
                    value={
                      mockSummary.latest_overall != null
                        ? `O:${mockSummary.latest_overall} C:${mockSummary.latest_communication ?? '—'} T:${mockSummary.latest_technical ?? '—'}`
                        : '—'
                    }
                    small
                  />
                </div>
                <MockHistoryList mocks={mocks} highlightId={mockRegistrationId} />
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
      <p className="mb-2 text-xs font-medium uppercase text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((s) => (
          <span key={s} className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${chipClass}`}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, small }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`font-semibold text-slate-900 ${small ? 'text-xs leading-relaxed' : ''}`}>{value}</p>
    </div>
  );
}

function MockHistoryList({ mocks, highlightId }) {
  if (!mocks.length) return <p className="text-sm text-slate-500">No mock history yet.</p>;
  return (
    <div className="max-h-72 space-y-2 overflow-y-auto">
      {mocks.map((m) => (
        <div
          key={m.id}
          className={`rounded-lg border p-3 text-sm ${
            m.id === highlightId ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${mockStatusBadgeClass(m.status)}`}>
              {mockStatusLabel(m.status)}
              {m.id === highlightId ? ' · this session' : ''}
            </span>
            <span className="text-xs text-slate-500">{formatDate(m.completed_at || m.scheduled_at || m.created_at)}</span>
          </div>
          {m.status === 'completed' ? (
            <p className="mt-2 text-slate-700">
              Overall <strong>{m.overall_score ?? '—'}</strong>
              {' · '}Comm <strong>{m.communication_score ?? '—'}</strong>
              {' · '}Tech <strong>{m.technical_score ?? '—'}</strong>
              {m.interviewer_name ? ` · ${m.interviewer_name}` : ''}
            </p>
          ) : null}
          {m.feedback_notes ? (
            <p className="mt-2 line-clamp-4 text-xs whitespace-pre-wrap text-slate-600">{m.feedback_notes}</p>
          ) : null}
          {Array.isArray(m.tech_feedback?.areas) && m.tech_feedback.areas.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {getTechFeedbackAreas(m).map((area) => (
                <span key={`${area.key}-${area.label}`} className="rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-800">
                  {area.label}: {area.score}/10
                  {area.rating ? ` · ${getMockRatingLabel(area.rating)}` : ''}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
