import { HiCheckCircle, HiInformationCircle } from 'react-icons/hi2';
import { PLAN_CHECKOUT_TERMS } from '../data/subscriptionProducts';

export default function PlanCheckoutTerms({ accepted, onAcceptedChange, showError = false }) {
  return (
    <section
      className={`mt-4 rounded-2xl border bg-linear-to-br from-slate-50 via-white to-indigo-50/30 p-3.5 sm:p-4 ${
        showError ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'
      }`}
      aria-labelledby="plan-checkout-terms-heading"
    >
      <div className="flex items-start gap-2.5">
        <HiInformationCircle className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 id="plan-checkout-terms-heading" className="text-sm font-semibold text-slate-900">
            Terms & conditions
          </h3>
          <ul className="mt-2 space-y-1.5">
            {PLAN_CHECKOUT_TERMS.map((term) => (
              <li key={term} className="flex gap-2 text-[13px] leading-snug text-slate-600 sm:text-sm">
                <HiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                <span>{term}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <label
        className={`mt-3 flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
          accepted
            ? 'border-indigo-200 bg-indigo-50/60'
            : 'border-slate-200 bg-white hover:border-slate-300'
        }`}
      >
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onAcceptedChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm leading-snug text-slate-700">
          I understand and agree to continue with payment.
        </span>
      </label>

      {showError ? (
        <p className="mt-2.5 text-xs font-medium text-amber-800" role="alert">
          Please accept the terms to continue.
        </p>
      ) : null}
    </section>
  );
}
