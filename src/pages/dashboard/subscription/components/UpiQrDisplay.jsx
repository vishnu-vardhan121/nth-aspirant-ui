import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { HiCheck, HiClipboardDocument, HiDevicePhoneMobile } from 'react-icons/hi2';
import { buildUpiPayUri, formatOrderReference } from '../lib/upi';
import { formatInr } from '../data/subscriptionProducts';

export default function UpiQrDisplay({ upiId, payeeName, amountInr, orderId, instructions }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(null);
  const orderRef = formatOrderReference(orderId);
  const upiUri = buildUpiPayUri({
    upiId,
    payeeName,
    amountInr,
    transactionNote: orderRef,
  });

  useEffect(() => {
    if (!upiUri) {
      setQrDataUrl('');
      return undefined;
    }
    let cancelled = false;
    QRCode.toDataURL(upiUri, { width: 280, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [upiUri]);

  const copyText = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  if (!upiId?.trim()) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-8 text-center text-sm text-amber-900">
        UPI payments are not configured yet. Please try again later or contact support.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-linear-to-b from-slate-50 to-white px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <div className="flex flex-col items-center gap-5 text-center lg:flex-row lg:items-center lg:justify-center lg:gap-10 lg:text-left">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="UPI payment QR code"
              className="h-48 w-48 shrink-0 rounded-2xl border-4 border-white bg-white p-1 shadow-md ring-1 ring-slate-200/80 sm:h-52 sm:w-52 lg:h-56 lg:w-56"
            />
          ) : (
            <div className="flex h-48 w-48 shrink-0 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 sm:h-52 sm:w-52 lg:h-56 lg:w-56">
              Generating QR…
            </div>
          )}

          <div className="min-w-0 lg:flex-1 lg:max-w-xs">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Amount to pay
            </p>
            <p className="mt-1 text-3xl font-black tabular-nums text-slate-900 sm:text-4xl lg:text-5xl">
              {formatInr(amountInr)}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Payee: <span className="font-medium text-slate-700">{payeeName}</span>
            </p>
            {upiUri ? (
              <a
                href={upiUri}
                className="mt-4 hidden w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 lg:inline-flex"
              >
                <HiDevicePhoneMobile className="h-5 w-5 shrink-0" aria-hidden />
                Open UPI app
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-2.5 p-4 sm:p-5 lg:grid-cols-2 lg:gap-3 lg:p-6">
        <CopyRow
          label="UPI ID"
          value={upiId}
          copied={copied === 'upi'}
          onCopy={() => copyText('upi', upiId)}
        />
        <CopyRow
          label="Order reference"
          value={orderRef}
          copied={copied === 'ref'}
          onCopy={() => copyText('ref', orderRef)}
        />

        {upiUri ? (
          <a
            href={upiUri}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 active:bg-indigo-700 lg:col-span-2 lg:hidden"
          >
            <HiDevicePhoneMobile className="h-5 w-5 shrink-0" aria-hidden />
            Open UPI app
          </a>
        ) : null}
      </div>

      {instructions ? (
        <p className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600 sm:px-5 lg:px-6 lg:text-sm">
          {instructions}
        </p>
      ) : null}
    </div>
  );
}

function CopyRow({ label, value, copied, onCopy }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 lg:px-4 lg:py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="break-all text-sm font-semibold text-slate-900 lg:text-base">{value}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${
          copied
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100'
        }`}
        aria-label={`Copy ${label}`}
      >
        {copied ? (
          <>
            <HiCheck className="h-4 w-4" aria-hidden />
            <span>Copied</span>
          </>
        ) : (
          <>
            <HiClipboardDocument className="h-4 w-4" aria-hidden />
            <span className="sr-only sm:not-sr-only">Copy</span>
          </>
        )}
      </button>
    </div>
  );
}
