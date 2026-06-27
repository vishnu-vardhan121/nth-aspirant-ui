import { Link } from 'react-router-dom';
import { HiCheckCircle, HiClock, HiBell, HiCreditCard } from 'react-icons/hi2';
import { formatInr } from '../data/subscriptionProducts';

export default function PaymentSubmittedStep({ product, onClose }) {
  return (
    <div className="py-2 text-center sm:py-4">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
        <HiCheckCircle className="h-9 w-9" aria-hidden />
      </div>

      <h3 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
        Thank you for submitting!
      </h3>

      {product ? (
        <p className="mt-2 text-sm font-medium text-slate-600">
          {product.name} plan · {formatInr(product.priceInr)}
        </p>
      ) : null}

      <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-slate-600">
        Our team will verify your payment and reach out within{' '}
        <strong className="font-semibold text-slate-800">24 hours</strong> on business days.
      </p>

      <ul className="mx-auto mt-6 max-w-sm space-y-3 text-left text-sm text-slate-600">
        <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3">
          <HiClock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <span>
            <strong className="font-semibold text-slate-800">Stay logged in.</strong> We will notify you on
            your dashboard once your plan is activated.
          </span>
        </li>
        <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3">
          <HiBell className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" aria-hidden />
          <span>You do not need to pay again while your payment is under review.</span>
        </li>
        <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3">
          <HiCreditCard className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" aria-hidden />
          <span>
            Track verification status anytime on the{' '}
            <Link
              to="/dashboard/payments"
              onClick={onClose}
              className="font-semibold text-indigo-600 hover:underline"
            >
              Payments
            </Link>{' '}
            page.
          </span>
        </li>
      </ul>

      <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
        <Link
          to="/dashboard/payments"
          onClick={onClose}
          className="nth-btn-primary flex items-center justify-center rounded-xl px-5 py-3 text-sm font-bold no-underline"
        >
          View payment status
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Back to dashboard
        </button>
      </div>
    </div>
  );
}
