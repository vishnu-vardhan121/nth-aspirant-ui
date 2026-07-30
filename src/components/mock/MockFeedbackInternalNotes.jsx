import {
  getRoleFitKeys,
  getPlacementRecommendation,
  getPlacementRecommendationNote,
  getCommunicationAdminNote,
  getPlacementRecommendationLabel,
} from '../../lib/mockFeedback';
import { getMockRoleFitLabel } from '../../lib/mockFeedbackTopics';

/**
 * Admin-only interviewer internal notes from mock feedback.
 * Never render on aspirant-facing pages.
 */
export default function MockFeedbackInternalNotes({ registration }) {
  if (!registration) return null;

  const placement = getPlacementRecommendation(registration);
  const placementNote = getPlacementRecommendationNote(registration);
  const commNote = getCommunicationAdminNote(registration);
  const roleFit = getRoleFitKeys(registration);

  if (!placement && !placementNote && !commNote && roleFit.length === 0) return null;

  return (
    <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-violet-900">
        Internal notes (admin only)
      </p>

      {placement ? (
        <div className="rounded-lg border border-violet-100 bg-white/90 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-800">Interview readiness</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{getPlacementRecommendationLabel(placement)}</p>
          {placementNote ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{placementNote}</p>
          ) : null}
        </div>
      ) : null}

      {commNote ? (
        <div className="rounded-lg border border-violet-100 bg-white/90 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-800">Communication (admin)</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{commNote}</p>
        </div>
      ) : null}

      {roleFit.length > 0 ? (
        <div className="rounded-lg border border-violet-100 bg-white/90 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-800">Role fit</p>
          <p className="mt-1 text-sm text-slate-700">{roleFit.map(getMockRoleFitLabel).join(' · ')}</p>
        </div>
      ) : null}
    </div>
  );
}
