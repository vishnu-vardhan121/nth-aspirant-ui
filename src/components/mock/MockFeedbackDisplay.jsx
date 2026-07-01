import {
  getTechFeedbackAreas,
  getOverallSuggestions,
  getMockRatingLabel,
  getMockRatingClass,
  hasAnyMockFeedback,
  hasLegacyMockFeedback,
  hasStructuredMockFeedback,
} from '../../lib/mockFeedback';
import MockFeedbackInternalNotes from './MockFeedbackInternalNotes';

export default function MockFeedbackDisplay({ registration, compact = false, showAdminFields = false }) {
  if (!registration || !hasAnyMockFeedback(registration)) return null;

  const areas = getTechFeedbackAreas(registration);
  const structured = hasStructuredMockFeedback(registration);
  const overallSuggestions = getOverallSuggestions(registration);

  if (compact) {
    return (
      <p className="text-sm text-slate-600">
        {structured ? (
          <>
            Overall <span className="font-medium">{registration.overall_score}/10</span>
            {' · '}
            Comm <span className="font-medium">{registration.communication_score}/10</span>
            {' · '}
            {areas.map((a) => `${a.label} ${a.score}`).join(' · ')}
          </>
        ) : (
          <>
            T:{registration.technical_score} · C:{registration.communication_score} · P:
            {registration.problem_solving_score} · O:{registration.overall_score}
          </>
        )}
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Interview feedback</p>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-slate-600">Overall</dt>
          <dd className="font-semibold text-slate-900">{registration.overall_score ?? '—'} / 10</dd>
        </div>
        <div>
          <dt className="text-slate-600">Communication</dt>
          <dd className="font-semibold text-slate-900">{registration.communication_score ?? '—'} / 10</dd>
        </div>
        {hasLegacyMockFeedback(registration) && !structured ? (
          <>
            <div>
              <dt className="text-slate-600">Technical</dt>
              <dd className="font-semibold text-slate-900">{registration.technical_score} / 10</dd>
            </div>
            <div>
              <dt className="text-slate-600">Problem solving</dt>
              <dd className="font-semibold text-slate-900">{registration.problem_solving_score} / 10</dd>
            </div>
          </>
        ) : null}
      </dl>

      {registration.feedback_notes ? (
        <div className="border-t border-emerald-200/60 pt-2">
          <p className="text-xs font-semibold uppercase text-slate-600">Overall summary</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{registration.feedback_notes}</p>
        </div>
      ) : null}

      {overallSuggestions ? (
        <div className="border-t border-emerald-200/60 pt-2">
          <p className="text-xs font-semibold uppercase text-slate-600">Overall suggestions</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{overallSuggestions}</p>
        </div>
      ) : null}

      {structured ? (
        <div className="space-y-2 border-t border-emerald-200/60 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Topics</p>
          <ul className="space-y-2">
            {areas.map((a) => (
              <li
                key={`${a.key}-${a.label}`}
                className="rounded-lg border border-emerald-100 bg-white/80 px-3 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{a.label}</span>
                  <div className="flex items-center gap-2">
                    {a.rating ? (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${getMockRatingClass(a.rating)}`}
                      >
                        {getMockRatingLabel(a.rating)}
                      </span>
                    ) : null}
                    <span className="tabular-nums font-bold text-indigo-700">{a.score} / 10</span>
                  </div>
                </div>
                {a.feedback ? (
                  <div className="mt-2">
                    <p className="text-[10px] font-semibold uppercase text-slate-500">Feedback</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-700">{a.feedback}</p>
                  </div>
                ) : a.notes ? (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{a.notes}</p>
                ) : null}
                {a.suggestions ? (
                  <div className="mt-2 rounded-md bg-indigo-50/80 px-2 py-1.5">
                    <p className="text-[10px] font-semibold uppercase text-indigo-700">Suggestions</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-xs text-indigo-900">{a.suggestions}</p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showAdminFields ? <MockFeedbackInternalNotes registration={registration} /> : null}

      {registration.completed_at ? (
        <p className="text-xs text-slate-500">
          Completed {new Date(registration.completed_at).toLocaleString('en-IN')}
        </p>
      ) : null}
    </div>
  );
}
