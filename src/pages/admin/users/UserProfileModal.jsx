import { useState, useEffect } from 'react';
import {
  HiXMark,
  HiUser,
  HiAcademicCap,
  HiTag,
  HiDocumentArrowDown,
  HiBriefcase,
  HiArrowTopRightOnSquare,
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
import ProfileMockHistorySection from './ProfileMockHistorySection';
import { ProfileDetailGrid, ProfileField, ProfileExternalLink, ProfileBadge } from './ProfileFields';
import { formatDate } from './formatters';
import { formatAspirantPhone } from './AspirantIdentity';

function ProfileHeader({ profile, onClose }) {
  const placed = profile?.profile_status === 'inactive';
  const initials = (profile?.full_name ?? profile?.email ?? '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <div className="sticky top-0 z-10 shrink-0 border-b border-slate-200 bg-white">
      <div className="flex items-start justify-between gap-4 px-6 py-5">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white shadow-sm">
            {initials || '?'}
          </span>
          <div className="min-w-0">
            <h2 id="admin-profile-title" className="truncate text-xl font-bold text-slate-900">
              {profile?.full_name ?? 'User profile'}
            </h2>
            {formatAspirantPhone(profile?.phone) ? (
              <p className="mt-0.5 truncate text-sm font-medium tabular-nums text-slate-700">
                {formatAspirantPhone(profile.phone)}
              </p>
            ) : null}
            {profile?.email ? (
              <p className="mt-0.5 truncate text-sm text-slate-500">{profile.email}</p>
            ) : null}
            {profile ? (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {profile.plan ? (
                  <ProfileBadge tone="indigo">{String(profile.plan).toUpperCase()}</ProfileBadge>
                ) : null}
                {profile.track ? (
                  <ProfileBadge tone="slate" className="capitalize">
                    {profile.track}
                  </ProfileBadge>
                ) : null}
                <ProfileBadge tone={placed ? 'amber' : 'emerald'}>
                  {placed ? 'Placed' : 'In pool'}
                </ProfileBadge>
                <ProfileBadge tone={profile.is_active ? 'emerald' : 'slate'}>
                  {profile.is_active ? 'Sub active' : 'Sub expired'}
                </ProfileBadge>
              </div>
            ) : null}
            {placed && profile?.placed_in ? (
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-medium text-slate-800">{profile.placed_in}</span>
                {profile.placed_at ? (
                  <span className="text-slate-500"> · {formatDate(profile.placed_at)}</span>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close"
        >
          <HiXMark className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function SkillGroup({ label, items, chipClass }) {
  if (!items.length) return null;
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s) => (
          <span key={s} className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${chipClass}`}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function EduMiniCard({ title, lines }) {
  const text = lines.filter(Boolean).join(' · ');
  if (!text) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{text}</p>
    </div>
  );
}

export default function UserProfileModal({ aspirantId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [resumeSignedUrl, setResumeSignedUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!aspirantId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setProfile(null);
      setResumeSignedUrl(null);
      const { data, error } = await supabase.rpc('get_aspirant_profile_for_admin', { p_aspirant_id: aspirantId });
      if (!cancelled) {
        if (!error && data) setProfile(typeof data === 'string' ? JSON.parse(data) : data);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
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
  const hasSkills = skills.length || secondarySkills.length || roleSpecs.length;
  const hasLinks = profile?.linkedin_url || profile?.portfolio_url || profile?.bio;
  const domains =
    jobDomainsLabel(profile?.job_domains) !== '—'
      ? jobDomainsLabel(profile?.job_domains)
      : jobDomainLabel(profile?.job_domain);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" aria-hidden onClick={onClose} />
      <div
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-profile-title"
      >
        <ProfileHeader profile={profile} onClose={onClose} />

        <div className="nth-scroll-y flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <LoaderPulse size="md" /> Loading profile…
            </div>
          ) : !profile ? (
            <p className="py-16 text-center text-sm text-slate-500">Could not load profile.</p>
          ) : (
            <div className="space-y-4">
              <ProfileSection icon={HiUser} title="Contact & career" subtitle="Availability and target roles">
                <ProfileDetailGrid>
                  <ProfileField label="Phone" value={profile.phone} />
                  <ProfileField
                    label="Location"
                    value={[profile.city, profile.country].filter(Boolean).join(', ') || undefined}
                  />
                  <ProfileField
                    label="Track"
                    value={profile.track ? profile.track.charAt(0).toUpperCase() + profile.track.slice(1) : undefined}
                  />
                  <ProfileField label="Role" value={profile.role_title ?? profile.primary_role} />
                  <ProfileField label="Target domains" value={domains !== '—' ? domains : undefined} span={2} />
                  <ProfileField label="Notice period" value={noticePeriodLabel(profile.notice_period)} />
                  {profile.available_from && profile.notice_period !== 'immediate' ? (
                    <ProfileField label="Last working day" value={formatDate(profile.available_from)} />
                  ) : null}
                  <ProfileField label="Communication" value={communicationLabel(profile.communication_level)} />
                  <ProfileField label="Willing to relocate" value={profile.willing_relocate ? 'Yes' : 'No'} />
                  {profile.track === 'experienced' ? (
                    <>
                      <ProfileField
                        label="Experience"
                        value={profile.experience_years != null ? `${profile.experience_years} years` : undefined}
                      />
                      <ProfileField label="Current company" value={profile.current_company} />
                      <ProfileField label="Work mode" value={profile.work_mode} />
                      <ProfileField
                        label="CTC / expected"
                        value={[profile.current_ctc, profile.expected_salary_min, profile.expected_salary_max]
                          .filter(Boolean)
                          .join(' · ') || undefined}
                        span={2}
                      />
                    </>
                  ) : null}
                </ProfileDetailGrid>
              </ProfileSection>

              <ProfileSection icon={HiAcademicCap} title="Education" subtitle="Qualification and institute">
                <ProfileDetailGrid>
                  <ProfileField
                    label="Qualification"
                    value={
                      profile.highest_qualification === 'other'
                        ? edu.graduation?.type || 'Other'
                        : qualificationLabel(profile.highest_qualification)
                    }
                  />
                  <ProfileField
                    label="Branch"
                    value={
                      branchLabel(profile.highest_qualification, profile.degree_branch, profile.degree_branch_other) ||
                      edu.graduation?.branch
                    }
                  />
                  <ProfileField label="College" value={profile.college_name} span={2} />
                  <ProfileField
                    label="Premier institute"
                    value={
                      premierInstituteLabel(profile.premier_institute_type) +
                      (isPremierInstituteSelection(profile.premier_institute_type) &&
                      profile.institute_tier &&
                      profile.institute_tier !== 'unrated'
                        ? ` · ${instituteTierLabel(profile.institute_tier)}`
                        : '')
                    }
                  />
                  <ProfileField
                    label="Batch / score"
                    value={[
                      profile.is_currently_studying
                        ? `Expected ${profile.expected_graduation_year ?? '—'}`
                        : profile.graduation_year ?? edu.graduation?.year,
                      profile.graduation_score != null
                        ? `${profile.graduation_score}${profile.graduation_score_type === 'percentage' ? '%' : ' CGPA'}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || undefined}
                  />
                </ProfileDetailGrid>

                {(edu.tenth?.marks || edu.twelfth?.marks || edu.diploma?.branch) ? (
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <EduMiniCard title="10th" lines={[edu.tenth?.marks, edu.tenth?.year]} />
                    <EduMiniCard title="12th" lines={[edu.twelfth?.marks, edu.twelfth?.year]} />
                    <EduMiniCard title="Diploma" lines={[edu.diploma?.branch, edu.diploma?.year]} />
                  </div>
                ) : null}
              </ProfileSection>

              {hasSkills ? (
                <ProfileSection icon={HiTag} title="Skills" subtitle="Primary, secondary, and specializations">
                  <SkillGroup label="Primary" items={skills} chipClass="bg-indigo-50 text-indigo-800 ring-1 ring-indigo-100" />
                  <SkillGroup label="Secondary" items={secondarySkills} chipClass="bg-slate-100 text-slate-700" />
                  <SkillGroup label="Specializations" items={roleSpecs} chipClass="bg-violet-50 text-violet-800 ring-1 ring-violet-100" />
                </ProfileSection>
              ) : null}

              {hasLinks ? (
                <ProfileSection icon={HiBriefcase} title="Links & bio" subtitle="Public profile links">
                  <ProfileDetailGrid>
                    {profile.linkedin_url ? (
                      <ProfileField label="LinkedIn">
                        <ProfileExternalLink href={profile.linkedin_url}>Open LinkedIn</ProfileExternalLink>
                      </ProfileField>
                    ) : null}
                    {profile.portfolio_url ? (
                      <ProfileField label="Portfolio">
                        <ProfileExternalLink href={profile.portfolio_url}>Open portfolio</ProfileExternalLink>
                      </ProfileField>
                    ) : null}
                    {profile.bio ? (
                      <ProfileField label="About" span={2}>
                        <p className="whitespace-pre-wrap font-normal leading-relaxed text-slate-700">{profile.bio}</p>
                      </ProfileField>
                    ) : null}
                  </ProfileDetailGrid>
                </ProfileSection>
              ) : null}

              <ProfileMockHistorySection profile={profile} mockSummary={mockSummary} mocks={mocks} />

              <ProfileSection icon={HiDocumentArrowDown} title="Resume">
                {profile.resume_url ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <HiDocumentArrowDown className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">Resume on file</p>
                        <p className="text-xs text-slate-500">PDF or document uploaded by aspirant</p>
                      </div>
                    </div>
                    {resumeSignedUrl ? (
                      <a
                        href={resumeSignedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                      >
                        View resume
                        <HiArrowTopRightOnSquare className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-sm text-slate-500">
                        <Loader size="xs" /> Preparing link…
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                    No resume uploaded.
                  </p>
                )}
              </ProfileSection>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
