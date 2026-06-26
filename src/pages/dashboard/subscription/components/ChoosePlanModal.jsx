import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { HiArrowLeft, HiXMark } from 'react-icons/hi2';
import { useAppSelector } from '../../../../store/hooks';
import { PageLoader } from '../../../../components/ui/Loader';
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';
import { formatProductPrice, isProductAvailable, PLAN_EXPERIENCE_NOTE } from '../data/subscriptionProducts';
import { getPlanModalTitle } from '../lib/planCheckout';
import {
  fetchPaymentConfig,
  submitSubscriptionPayment,
} from '../api/paymentOrders';
import PlanOptionCard from './PlanOptionCard';
import PayStep from './PayStep';

function newPaymentRef() {
  return crypto.randomUUID();
}

export default function ChoosePlanModal({ open, onClose }) {
  const userId = useAppSelector((state) => state.auth.user?.id);
  const { plan, hasActivePlan, selectablePlans } = useSubscriptionStatus();

  const [step, setStep] = useState('plans');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [paymentRef, setPaymentRef] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    setStep('plans');
    setSelectedProduct(null);
    setPaymentRef(null);
    setPaymentConfig(null);
    setError('');
    setLoading(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const title = getPlanModalTitle({
    step,
    productName: selectedProduct?.name,
    hasActivePlan,
    plan,
  });

  const noPlansToShow = step === 'plans' && selectablePlans.length === 0;
  const panelWidth =
    step === 'pay'
      ? 'max-w-5xl'
      : step === 'plans' && selectablePlans.length > 1
        ? 'max-w-3xl'
        : 'max-w-lg';

  const subtitle =
    step === 'plans'
      ? noPlansToShow
        ? 'You are already on the highest available plan.'
        : 'Select a pack to continue to payment.'
      : 'Scan the QR or open your UPI app, then submit your transaction ID.';

  const handleChoosePlan = async (product) => {
    if (!isProductAvailable(product)) return;

    setLoading(true);
    setError('');
    try {
      const config = await fetchPaymentConfig();
      setPaymentConfig(config);
      setSelectedProduct(product);
      setPaymentRef(newPaymentRef());
      setStep('pay');
    } catch (e) {
      setError(e.message || 'Could not load payment details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProof = async ({ utr, payerNote, screenshotFile }) => {
    if (!selectedProduct || !userId) return;
    setLoading(true);
    setError('');
    try {
      await submitSubscriptionPayment({
        userId,
        paymentRef,
        planId: selectedProduct.planId,
        amountInr: selectedProduct.priceInr,
        durationMonths: selectedProduct.durationMonths,
        utr,
        payerNote,
        screenshotFile,
      });
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to submit proof');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-900/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`flex max-h-[min(92dvh,720px)] w-full ${panelWidth} flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[min(90vh,800px)] sm:rounded-2xl lg:max-h-[min(88vh,820px)]`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="choose-plan-title"
      >
        <header className="relative shrink-0 border-b border-slate-100 px-4 pb-4 pt-3 sm:px-5 sm:py-4">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden />

          {step === 'pay' ? (
            <button
              type="button"
              onClick={() => {
                setStep('plans');
                setPaymentRef(null);
                setSelectedProduct(null);
                setError('');
              }}
              className="mb-2 inline-flex items-center gap-1 rounded-lg px-1 py-0.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              <HiArrowLeft className="h-4 w-4" aria-hidden />
              All plans
            </button>
          ) : null}

          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <h2 id="choose-plan-title" className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                {title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:right-4 sm:top-4"
            aria-label="Close"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        </header>

        <div
          className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-5 lg:px-8 ${
            step === 'pay' ? 'nth-scroll-y' : ''
          }`}
        >
          {step === 'plans' ? (
            <>
              {error ? (
                <p className="mb-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700" role="alert">
                  {error}
                </p>
              ) : null}
              {loading ? (
                <PageLoader size="sm" label="Loading payment…" className="py-16" />
              ) : noPlansToShow ? (
                <p className="py-12 text-center text-sm text-slate-600">
                  No upgrade is available for your current plan.
                </p>
              ) : (
                <>
                  <p className="mb-4 rounded-xl border border-amber-200/90 bg-amber-50 px-3.5 py-3 text-sm leading-relaxed text-amber-950">
                    <span className="font-semibold">Note:</span> {PLAN_EXPERIENCE_NOTE}
                  </p>
                  <div
                    className={`grid gap-4 ${
                      selectablePlans.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
                    }`}
                  >
                    {selectablePlans.map((product) => (
                      <PlanOptionCard
                        key={product.planId}
                        product={product}
                        priceLabel={formatProductPrice(product)}
                        onSelect={handleChoosePlan}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <PayStep
              product={selectedProduct}
              paymentRef={paymentRef}
              paymentConfig={paymentConfig}
              loading={loading}
              error={error}
              onSubmitProof={handleSubmitProof}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
