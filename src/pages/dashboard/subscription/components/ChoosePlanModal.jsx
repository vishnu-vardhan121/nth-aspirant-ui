import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { HiArrowLeft, HiXMark } from 'react-icons/hi2';
import { useAppSelector } from '../../../../store/hooks';
import { ButtonLoader } from '../../../../components/ui/Loader';
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';
import {
  formatProductPrice,
  formatInr,
  getExperienceBandLabel,
  isProductAvailable,
  PACK_CONTACT_EMAIL,
  requiresPackContact,
} from '../data/subscriptionProducts';
import { getSelectablePlans, getPlanModalTitle } from '../lib/planCheckout';
import {
  fetchPaymentConfig,
  submitSubscriptionPayment,
} from '../api/paymentOrders';
import PlanOptionCard from './PlanOptionCard';
import PayStep from './PayStep';
import PlanCheckoutTerms from './PlanCheckoutTerms';
import ExperienceBandSelector from './ExperienceBandSelector';

function newPaymentRef() {
  return crypto.randomUUID();
}

export default function ChoosePlanModal({ open, onClose }) {
  const userId = useAppSelector((state) => state.auth.user?.id);
  const { profile, plan, hasActivePlan, profileExperienceBand } = useSubscriptionStatus();

  const [step, setStep] = useState('plans');
  const [selectedBand, setSelectedBand] = useState(profileExperienceBand);
  const [pickedPlan, setPickedPlan] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [paymentRef, setPaymentRef] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);

  const selectablePlans = useMemo(
    () => getSelectablePlans(profile, plan, hasActivePlan, selectedBand),
    [profile, plan, hasActivePlan, selectedBand],
  );
  const requiresAdminContact = requiresPackContact(selectedBand);

  useEffect(() => {
    if (!open) return undefined;
    setStep('plans');
    setSelectedBand(profileExperienceBand);
    setPickedPlan(null);
    setSelectedProduct(null);
    setPaymentRef(null);
    setPaymentConfig(null);
    setError('');
    setLoading(false);
    setTermsAccepted(false);
    setTermsError(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, profileExperienceBand]);

  useEffect(() => {
    if (step !== 'plans' || selectablePlans.length === 0) return;
    setPickedPlan((prev) => {
      if (prev) {
        const match = selectablePlans.find((p) => p.planId === prev.planId);
        if (match) return match;
      }
      return selectablePlans.find((p) => p.popular) ?? selectablePlans[0];
    });
  }, [selectablePlans, step]);

  if (!open) return null;

  const title = getPlanModalTitle({
    step,
    productName: selectedProduct?.name,
    hasActivePlan,
    plan,
  });

  const noPlansToShow = step === 'plans' && selectablePlans.length === 0 && !requiresAdminContact;
  const experienceLabel = getExperienceBandLabel(selectedBand);
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
        : 'Select a pack, accept the terms, then continue to payment.'
      : 'Scan the QR or open your UPI app, then submit your transaction ID.';

  const handleContinueToPayment = async () => {
    if (!pickedPlan || !isProductAvailable(pickedPlan)) return;

    if (!termsAccepted) {
      setTermsError(true);
      return;
    }

    setSelectedProduct(pickedPlan);
    setError('');
    setTermsError(false);
    setLoading(true);
    try {
      const config = await fetchPaymentConfig();
      setPaymentConfig(config);
      setPaymentRef(newPaymentRef());
      setStep('pay');
    } catch (e) {
      setError(e.message || 'Could not load payment details');
    } finally {
      setLoading(false);
    }
  };

  const handleBackFromPay = () => {
    setStep('plans');
    setPaymentRef(null);
    setPaymentConfig(null);
    setError('');
  };

  const handleTermsAcceptedChange = (accepted) => {
    setTermsAccepted(accepted);
    if (accepted) setTermsError(false);
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

  const showPlansFooter = step === 'plans' && !noPlansToShow && !requiresAdminContact;
  const continueLabel = pickedPlan
    ? `Continue with ${pickedPlan.name} · ${formatInr(pickedPlan.priceInr)}`
    : 'Select a plan to continue';

  const panelMaxHeight =
    step === 'pay'
      ? 'max-h-[min(92dvh,720px)] sm:max-h-[min(90vh,800px)] lg:max-h-[min(88vh,820px)]'
      : 'max-h-[min(96dvh,920px)] sm:max-h-[min(94vh,900px)]';

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-900/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`flex ${panelMaxHeight} w-full ${panelWidth} flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl`}
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
              onClick={handleBackFromPay}
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
          className={`nth-scroll-y min-h-0 flex-1 overflow-x-hidden px-4 py-3 sm:px-6 sm:py-4 lg:px-8 ${
            step === 'pay' ? 'lg:py-5' : ''
          }`}
        >
          {step === 'plans' ? (
            <>
              {error ? (
                <p className="mb-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700" role="alert">
                  {error}
                </p>
              ) : null}
              {noPlansToShow ? (
                <p className="py-12 text-center text-sm text-slate-600">
                  No upgrade is available for your current plan.
                </p>
              ) : requiresAdminContact ? (
                <div className="py-4">
                  <ExperienceBandSelector value={selectedBand} onChange={setSelectedBand} />
                  <div className="py-6 text-center">
                    <p className="text-sm font-medium text-slate-900">Plans for {experienceLabel}</p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">
                      For candidates with more than 5 years of experience, please contact our team for a
                      custom plan.
                    </p>
                    <a
                      href={`mailto:${PACK_CONTACT_EMAIL}?subject=${encodeURIComponent('Naveen Talent Hub – plan enquiry')}`}
                      className="nth-btn-primary mt-6 inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold"
                    >
                      {PACK_CONTACT_EMAIL}
                    </a>
                  </div>
                </div>
              ) : (
                <>
                  <ExperienceBandSelector value={selectedBand} onChange={setSelectedBand} />
                  <div
                    className={`grid gap-3 ${
                      selectablePlans.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
                    }`}
                  >
                    {selectablePlans.map((product) => (
                      <PlanOptionCard
                        key={product.planId}
                        product={product}
                        priceLabel={formatProductPrice(product)}
                        selected={pickedPlan?.planId === product.planId}
                        onSelect={setPickedPlan}
                        disabled={loading}
                      />
                    ))}
                  </div>
                  <PlanCheckoutTerms
                    accepted={termsAccepted}
                    onAcceptedChange={handleTermsAcceptedChange}
                    showError={termsError}
                  />
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

        {showPlansFooter ? (
          <footer className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 sm:px-6 sm:py-3.5 lg:px-8">
            <button
              type="button"
              disabled={!pickedPlan || loading}
              onClick={handleContinueToPayment}
              className="nth-btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold disabled:opacity-60"
            >
              {loading ? <ButtonLoader /> : null}
              {continueLabel}
            </button>
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
