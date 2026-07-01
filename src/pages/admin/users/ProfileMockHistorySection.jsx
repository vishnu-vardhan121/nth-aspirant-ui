import {
  getTechFeedbackAreas,
  getOverallSuggestions,
  getMockRatingLabel,
  getRoleFitKeys,
  getPlacementRecommendation,
  getPlacementRecommendationNote,
  getCommunicationAdminNote,
  getPlacementRecommendationLabel,
} from '../../../lib/mockFeedback';
import { getMockRoleFitLabel } from '../../../lib/mockFeedbackTopics';
import { mergeRoleFitKeys } from './aggregateMockRoleFit';
import ProfileSection from './ProfileSection';
import { ProfileBadge } from './ProfileFields';
import { formatDate, mockStatusBadgeClass, mockStatusLabel } from './formatters';
import { HiClipboardDocumentCheck } from 'react-icons/hi2';

function ScorePill({ label, value }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-center min-w-[4.5rem]">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">
        {value ?? '—'}
        <span className="text-xs font-normal text-slate-400">/10</span>
      </span>
    </div>
  );
}

function MockCard({ mock, index }) {
  const areas = getTechFeedbackAreas(mock);
  const roleFit = getRoleFitKeys(mock);
  const placement = getPlacementRecommendation(mock);
  const placementNote = getPlacementRecommendationNote(mock);
  const commAdminNote = getCommunicationAdminNote(mock);
  const overallSuggestions = getOverallSuggestions(mock);
  const isCompleted = mock.status === 'completed';

  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">#{index + 1}</span>
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${mockStatusBadgeClass(mock.status)}`}>
            {mockStatusLabel(mock.status)}
          </span>
          {mock.interviewer_name ? (
            <span className="text-sm text-slate-600">{mock.interviewer_name}</span>
          ) : null}
        </div>
        <time className="text-xs font-medium text-slate-500">
          {formatDate(mock.completed_at || mock.scheduled_at || mock.created_at)}
        </time>
      </div>

      <div className="space-y-4 p-4">
        {mock.availability_notes ? (
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-700">Availability:</span> {mock.availability_notes}
          </p>
        ) : null}

        {isCompleted ? (
          <>
            <div className="flex flex-wrap gap-2">
              <ScorePill label="Overall" value={mock.overall_score} />
              <ScorePill label="Comm." value={mock.communication_score} />
              <ScorePill label="Tech." value={mock.technical_score} />
            </div>

            {mock.feedback_notes ? (
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Overall summary</p>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{mock.feedback_notes}</p>
              </div>
            ) : null}

            {overallSuggestions ? (
              <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-800">Suggestions</p>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{overallSuggestions}</p>
              </div>
            ) : null}

            {areas.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Topic feedback</p>
                <div className="space-y-2">
                  {areas.map((area) => (
                    <div key={`${mock.id}-${area.key}`} className="rounded-lg border border-indigo-100 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{area.label}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-bold tabular-nums text-indigo-700">{area.score}/10</span>
                          {area.rating ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                              {getMockRatingLabel(area.rating)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {area.feedback ? (
                        <p className="mt-2 text-sm leading-relaxed text-slate-700">
                          <span className="font-medium text-slate-800">Feedback:</span> {area.feedback}
                        </p>
                      ) : null}
                      {area.suggestions ? (
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">
                          <span className="font-medium text-slate-700">Suggestions:</span> {area.suggestions}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {roleFit.length > 0 ? (
              <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-800">Recommended for (this mock)</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {roleFit.map((key) => (
                    <ProfileBadge key={key} tone="violet">
                      {getMockRoleFitLabel(key)}
                    </ProfileBadge>
                  ))}
                </div>
              </div>
            ) : null}

            {placement || placementNote || commAdminNote ? (
              <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-3 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-800">Internal notes</p>
                {placement ? (
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Placement pipeline</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-900">{getPlacementRecommendationLabel(placement)}</p>
                    {placementNote ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{placementNote}</p>
                    ) : null}
                  </div>
                ) : null}
                {commAdminNote ? (
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Communication (admin)</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{commAdminNote}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-slate-500">No feedback yet for this mock.</p>
        )}
      </div>
    </article>
  );
}

function SummaryCard({ label, value, sub, mono }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 font-semibold text-slate-900 ${mono ? 'font-mono text-xs leading-relaxed' : 'text-sm'}`}>
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

export default function ProfileMockHistorySection({ profile, mockSummary, mocks }) {
  const allRoleFit = mergeRoleFitKeys(...mocks.map((m) => getRoleFitKeys(m)));

  return (
    <ProfileSection
      icon={HiClipboardDocumentCheck}
      title="Plan & mock interviews"
      subtitle="Subscription usage, scores, and full mock history"
    >
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          label="Plan"
          value={(profile.plan ?? '—').toString().toUpperCase()}
          sub={profile.is_active ? 'Subscription active' : 'Subscription expired'}
        />
        <SummaryCard
          label="This period"
          value={`${mockSummary.mocks_conducted_in_period ?? 0} / ${mockSummary.mock_limit ?? profile.mock_limit ?? 0}`}
          sub="Mocks used"
        />
        <SummaryCard label="Completed" value={mockSummary.completed_total ?? 0} sub="All time" />
        <SummaryCard
          label="Latest scores"
          value={
            mockSummary.latest_overall != null
              ? `O ${mockSummary.latest_overall} · C ${mockSummary.latest_communication ?? '—'} · T ${mockSummary.latest_technical ?? '—'}`
              : '—'
          }
          mono
        />
      </div>

      <p className="mb-4 text-xs text-slate-500">
        Scheduled {mockSummary.scheduled_count ?? 0} · Requested {mockSummary.requested_count ?? 0}
        {mockSummary.latest_completed_at ? ` · Last completed ${formatDate(mockSummary.latest_completed_at)}` : ''}
      </p>

      {allRoleFit.length > 0 ? (
        <div className="mb-5 rounded-lg border border-violet-200 bg-violet-50/30 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-800">Recommended for (all mocks)</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {allRoleFit.map((key) => (
              <ProfileBadge key={key} tone="violet">
                {getMockRoleFitLabel(key)}
              </ProfileBadge>
            ))}
          </div>
        </div>
      ) : null}

      <div className="border-t border-slate-100 pt-4">
        <h4 className="mb-3 text-sm font-semibold text-slate-900">Mock history ({mocks.length})</h4>
        {!mocks.length ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            No mock registrations yet.
          </p>
        ) : (
          <div className="space-y-3">
            {mocks.map((m, i) => (
              <MockCard key={m.id} mock={m} index={i} />
            ))}
          </div>
        )}
      </div>
    </ProfileSection>
  );
}
