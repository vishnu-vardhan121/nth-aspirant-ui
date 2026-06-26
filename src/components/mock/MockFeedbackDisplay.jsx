import {
  getTechFeedbackAreas,
  hasAnyMockFeedback,
  hasLegacyMockFeedback,
  hasStructuredMockFeedback,
} from '../../lib/mockFeedback';

export default function MockFeedbackDisplay({ registration, compact = false }) {
  if (!registration || !hasAnyMockFeedback(registration)) return null;

  const areas = getTechFeedbackAreas(registration);
  const structured = hasStructuredMockFeedback(registration);

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
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 space-y-3">
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
        <p className="text-sm text-slate-800 whitespace-pre-wrap border-t border-emerald-200/60 pt-2">
          {registration.feedback_notes}
        </p>
      ) : null}

      {structured ? (
        <div className="border-t border-emerald-200/60 pt-3 space-y-2">
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Technical areas</p>
          <ul className="space-y-2">
            {areas.map((a) => (
              <li key={`${a.key}-${a.label}`} className="rounded-lg bg-white/80 border border-emerald-100 px-3 py-2 text-sm">
                <div className="flex justify-between gap-2 font-medium text-slate-900">
                  <span>{a.label}</span>
                  <span className="tabular-nums">{a.score} / 10</span>
                </div>
                {a.notes ? <p className="mt-1 text-slate-600 text-xs whitespace-pre-wrap">{a.notes}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {registration.completed_at ? (
        <p className="text-xs text-slate-500">Completed {new Date(registration.completed_at).toLocaleString('en-IN')}</p>
      ) : null}
    </div>
  );
}
