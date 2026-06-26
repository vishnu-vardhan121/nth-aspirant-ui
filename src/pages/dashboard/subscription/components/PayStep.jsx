import { useState } from 'react';
import { HiCheckCircle } from 'react-icons/hi2';
import { ButtonLoader } from '../../../../components/ui/Loader';
import { formatInr, PLAN_EXPERIENCE_NOTE, PLAN_MOCK_FEATURE } from '../data/subscriptionProducts';
import UpiQrDisplay from './UpiQrDisplay';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:text-sm';

function PlanSummary({ product }) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50/80 via-white to-violet-50/40 px-4 py-4 lg:px-5 lg:py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-lg font-bold text-slate-900">{product?.name} plan</p>
        <p className="text-2xl font-black tabular-nums text-indigo-700 lg:text-3xl">
          {formatInr(product?.priceInr)}
        </p>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        {product?.durationMonths} month{product?.durationMonths === 1 ? '' : 's'} access
      </p>
      <p className="mt-3 flex items-start gap-1.5 text-sm text-slate-600">
        <HiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
        {PLAN_MOCK_FEATURE}
      </p>
      <p className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs leading-relaxed text-amber-950 lg:text-sm">
        <span className="font-semibold">Note:</span> {PLAN_EXPERIENCE_NOTE}
      </p>
    </div>
  );
}

function ProofFields({
  utr,
  setUtr,
  payerNote,
  setPayerNote,
  screenshotFile,
  handleFileChange,
  fileError,
  confirmed,
  setConfirmed,
  product,
}) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="pay-utr" className="mb-1.5 block text-sm font-medium text-slate-800">
          UTR / Transaction ID <span className="text-red-500">*</span>
        </label>
        <input
          id="pay-utr"
          type="text"
          inputMode="text"
          autoComplete="off"
          value={utr}
          onChange={(e) => setUtr(e.target.value)}
          placeholder="e.g. 123456789012"
          maxLength={50}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="pay-note" className="mb-1.5 block text-sm font-medium text-slate-800">
          Note <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="pay-note"
          type="text"
          value={payerNote}
          onChange={(e) => setPayerNote(e.target.value)}
          placeholder="Any extra detail for our team"
          maxLength={200}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="pay-screenshot" className="mb-1.5 block text-sm font-medium text-slate-800">
          Payment screenshot <span className="font-normal text-slate-400">(recommended)</span>
        </label>
        <input
          id="pay-screenshot"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2.5 file:text-sm file:font-semibold file:text-indigo-700"
        />
        {screenshotFile ? (
          <p className="mt-1.5 truncate text-xs text-emerald-700">Selected: {screenshotFile.name}</p>
        ) : null}
        {fileError ? <p className="mt-1.5 text-xs text-red-600">{fileError}</p> : null}
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm leading-snug text-slate-700">
          I confirm I paid exactly{' '}
          <strong className="font-semibold text-slate-900">{formatInr(product?.priceInr)}</strong> to the UPI ID
          shown.
        </span>
      </label>
    </div>
  );
}

function SubmitBlock({ loading, disabled, className = '' }) {
  return (
    <div className={className}>
      <button
        type="submit"
        disabled={disabled}
        className="nth-btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold disabled:opacity-60 lg:py-4"
      >
        {loading ? <ButtonLoader /> : null}
        Submit for verification
      </button>
      <p className="mt-2 text-center text-[11px] text-slate-500 lg:text-xs">
        We usually verify payments within 24 hours on business days.
      </p>
    </div>
  );
}

export default function PayStep({ product, paymentRef, paymentConfig, loading, error, onSubmitProof }) {
  const [utr, setUtr] = useState('');
  const [payerNote, setPayerNote] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleFileChange = (e) => {
    setFileError('');
    const file = e.target.files?.[0];
    if (!file) {
      setScreenshotFile(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError('Use JPG, PNG, WebP, or PDF.');
      setScreenshotFile(null);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError('File must be 5 MB or smaller.');
      setScreenshotFile(null);
      return;
    }
    setScreenshotFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    const trimmed = utr.trim();
    if (trimmed.length < 8) {
      setLocalError('Enter your UTR / transaction reference (at least 8 characters).');
      return;
    }
    if (!confirmed) {
      setLocalError('Please confirm you paid the exact amount shown.');
      return;
    }
    await onSubmitProof({ utr: trimmed, payerNote: payerNote.trim(), screenshotFile });
  };

  const displayError = localError || error;
  const submitDisabled = loading || !paymentConfig?.upiId;

  const proofProps = {
    utr,
    setUtr,
    payerNote,
    setPayerNote,
    screenshotFile,
    handleFileChange,
    fileError,
    confirmed,
    setConfirmed,
    product,
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="grid gap-5 pb-4 lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-8 xl:gap-10">
        <div className="space-y-4 lg:space-y-5">
          <PlanSummary product={product} />

          <section aria-labelledby="pay-qr-heading">
            <h3
              id="pay-qr-heading"
              className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 lg:mb-3 lg:text-sm"
            >
              Step 1 · Pay via UPI
            </h3>
            <UpiQrDisplay
              upiId={paymentConfig?.upiId}
              payeeName={paymentConfig?.payeeName}
              amountInr={product?.priceInr}
              orderId={paymentRef}
              instructions={paymentConfig?.instructions}
            />
          </section>
        </div>

        <div className="lg:sticky lg:top-0">
          <section
            aria-labelledby="pay-proof-heading"
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6 lg:shadow-md"
          >
            <h3
              id="pay-proof-heading"
              className="text-xs font-bold uppercase tracking-wider text-slate-500 lg:text-sm"
            >
              Step 2 · Submit proof
            </h3>
            <p className="mt-1 mb-4 text-sm text-slate-600 lg:mb-5 lg:text-base">
              After paying, enter your transaction ID so we can verify your payment.
            </p>

            <ProofFields {...proofProps} />

            {displayError ? (
              <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700" role="alert">
                {displayError}
              </p>
            ) : null}

            <SubmitBlock
              loading={loading}
              disabled={submitDisabled}
              className="mt-5 hidden lg:block"
            />
          </section>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-slate-100 bg-white/95 px-4 py-4 backdrop-blur-sm supports-backdrop-filter:bg-white/90 sm:-mx-5 sm:px-5 lg:hidden">
        {displayError ? (
          <p className="mb-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700" role="alert">
            {displayError}
          </p>
        ) : null}
        <SubmitBlock loading={loading} disabled={submitDisabled} />
      </div>
    </form>
  );
}
