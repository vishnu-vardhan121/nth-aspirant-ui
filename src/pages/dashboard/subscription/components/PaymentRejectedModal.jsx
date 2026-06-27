import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HiExclamationCircle, HiXMark } from 'react-icons/hi2';
import { formatPaymentPlanLine } from '../../../../lib/paymentOrderDisplay';
import { formatInr } from '../data/subscriptionProducts';

const DEFAULT_REASON =
  'We could not verify this payment. Please check your UTR and payment screenshot, then submit again.';

export default function PaymentRejectedModal({ open, order, onClose, onTryAgain }) {
  if (typeof document === 'undefined') return null;

  const reason = String(order?.admin_notes ?? '').trim() || DEFAULT_REASON;
  const planLine = formatPaymentPlanLine(order?.plan, order?.duration_months);

  return createPortal(
    <AnimatePresence>
      {open && order ? (
        <motion.div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="presentation"
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="payment-rejected-title"
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-red-200 bg-white shadow-2xl"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            <div className="bg-linear-to-br from-red-600 via-red-600 to-rose-700 px-6 pb-8 pt-10 text-center text-white">
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 rounded-xl p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <HiXMark className="h-5 w-5" />
              </button>

              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                <HiExclamationCircle className="h-9 w-9" aria-hidden />
              </div>

              <h2 id="payment-rejected-title" className="text-2xl font-black tracking-tight sm:text-3xl">
                Payment not verified
              </h2>
              <p className="mt-2 text-sm text-red-100 sm:text-base">
                {planLine} · {formatInr(order.amount_inr)}
              </p>
            </div>

            <div className="space-y-5 px-6 py-6">
              <p className="text-sm leading-relaxed text-slate-600">
                Your UPI payment could not be approved. No plan was activated. Details are below.
              </p>

              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Reason from our team</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-red-900">{reason}</p>
                {order.utr ? (
                  <p className="mt-3 font-mono text-xs text-red-800/80">
                    UTR: <span className="font-semibold">{order.utr}</span>
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => {
                  onTryAgain?.();
                  onClose();
                }}
                className="flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-3.5 text-sm font-bold text-white transition-colors hover:bg-red-500"
              >
                Submit payment again
              </button>

              <Link
                to="/dashboard/payments"
                onClick={onClose}
                className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 no-underline transition-colors hover:bg-slate-50"
              >
                View in My payments
              </Link>

              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
