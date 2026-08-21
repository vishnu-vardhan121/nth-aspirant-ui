import { useEffect, useState } from 'react';
import { HiSparkles } from 'react-icons/hi2';
import { requestCourseGolden } from '../../lib/courses';
import CourseGoldenPayPanel from './CourseGoldenPayPanel';
import RequestSubmittedModal from './RequestSubmittedModal';
import StaffFormModal from './StaffFormModal';

/**
 * Enrolled aspirant: request Golden access via modal (optional per-course T&C).
 */
export default function CourseGoldenAccessCard({ course, onUpdated }) {
  const status = course?.membership_status;
  const accessState = course?.access_state || 'none';
  const termsEnabled = Boolean(course?.golden_terms_enabled);
  const termsBullets = Array.isArray(course?.golden_terms_bullets)
    ? (() => {
        const seen = new Set();
        const out = [];
        for (const raw of course.golden_terms_bullets) {
          const item = String(raw || '').trim();
          if (!item) continue;
          const key = item.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(item);
        }
        return out;
      })()
    : [];
  const hasTerms = termsEnabled && termsBullets.length > 0;

  const [modalOpen, setModalOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [submittedOpen, setSubmittedOpen] = useState(false);

  useEffect(() => {
    if (!modalOpen) {
      setReason('');
      setAgreed(false);
      setBusy(false);
    }
  }, [modalOpen]);

  if (!course?.id) return null;
  if (!['free', 'golden_requested', 'golden_rejected', 'golden'].includes(status)) return null;

  const canRequest = status === 'free' || status === 'golden_rejected';

  const submit = async () => {
    setMsg({ type: '', text: '' });
    if (hasTerms && !agreed) {
      setMsg({ type: 'error', text: 'Please accept the Terms & Conditions.' });
      return;
    }
    setBusy(true);
    const res = await requestCourseGolden(course.id, reason, hasTerms ? agreed : true);
    setBusy(false);
    if (!res.ok) {
      setMsg({ type: 'error', text: res.error || 'Could not submit request' });
      return;
    }
    setModalOpen(false);
    setMsg({ type: '', text: '' });
    setSubmittedOpen(true);
    onUpdated?.();
  };

  let body = null;

  if (status === 'golden' && accessState === 'awaiting_payment') {
    body = <CourseGoldenPayPanel courseId={course.id} onUpdated={onUpdated} />;
  } else if (status === 'golden' && accessState === 'completed') {
    body = (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-3">
        <p className="text-sm font-semibold text-emerald-900">Golden access is active</p>
        <p className="mt-0.5 text-xs text-emerald-800/80">All installments are paid for this course.</p>
      </div>
    );
  } else if (status === 'golden' && (accessState === 'active' || accessState === 'paused')) {
    body = <CourseGoldenPayPanel courseId={course.id} onUpdated={onUpdated} />;
  } else if (status === 'golden_requested') {
    body = (
      <div className="rounded-xl border border-amber-200/90 bg-white px-3.5 py-3.5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <HiSparkles className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Request under review</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Approval usually takes up to <span className="font-semibold text-slate-800">48 hours</span>.
              Please check the app for updates.
            </p>
          </div>
        </div>
      </div>
    );
  } else if (status === 'golden_rejected') {
    body = (
      <div className="space-y-3">
        <p className="text-sm text-slate-700">
          Your Golden access request wasn’t approved. You can request again.
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-500 sm:w-auto"
        >
          Request again
        </button>
      </div>
    );
  } else if (status === 'free') {
    body = (
      <div className="space-y-3">
        {course?.recordings_locked_for_free ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Premium phase has started — free Play is locked. Request Golden access to continue with
            recordings and Golden classes.
          </p>
        ) : (
          <p className="text-sm text-slate-700">
            Ready for the full course? Request Golden access. Admin or interviewer will review.
          </p>
        )}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-500 sm:w-auto"
        >
          Request Golden access
        </button>
      </div>
    );
  }

  return (
    <>
      <section className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <HiSparkles className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-800">
              Golden access
            </p>
            <div className="mt-2">{body}</div>
            {msg.text && !modalOpen ? (
              <p
                className={`mt-2 text-sm ${msg.type === 'error' ? 'text-red-600' : 'text-emerald-700'}`}
              >
                {msg.text}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {canRequest ? (
        <StaffFormModal
          open={modalOpen}
          onClose={() => !busy && setModalOpen(false)}
          title="Request Golden access"
          subtitle={course.title}
          wide
        >
          <div className="space-y-4">
            {hasTerms ? (
              <div>
                <p className="mb-1.5 text-sm font-semibold text-slate-800">Terms &amp; Conditions</p>
                <div className="max-h-[min(40vh,14rem)] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] sm:max-h-56">
                  <ul className="list-disc space-y-2.5 pl-5 text-sm leading-relaxed text-slate-700">
                    {termsBullets.map((item, i) => (
                      <li key={`tc-${i}`}>{item}</li>
                    ))}
                  </ul>
                </div>
                <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-amber-600 focus:ring-amber-500"
                  />
                  <span>I have read and agree to the Terms &amp; Conditions</span>
                </label>
              </div>
            ) : null}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Reason <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, 500))}
                rows={3}
                maxLength={500}
                className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-base shadow-sm sm:text-sm"
                placeholder="Why you want Golden access…"
              />
              <p className="mt-1 text-right text-xs tabular-nums text-slate-400">
                {reason.length}/500
              </p>
            </div>

            {msg.text && modalOpen ? (
              <p className={`text-sm ${msg.type === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>
                {msg.text}
              </p>
            ) : null}

            <button
              type="button"
              disabled={busy || (hasTerms && !agreed)}
              onClick={submit}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-60"
            >
              {busy ? 'Submitting…' : 'Submit request'}
            </button>
          </div>
        </StaffFormModal>
      ) : null}

      <RequestSubmittedModal
        open={submittedOpen}
        onClose={() => setSubmittedOpen(false)}
        title="Golden access request submitted"
        body="Your request for Golden access has been received. Our team will review it shortly."
        hours={48}
      />
    </>
  );
}
