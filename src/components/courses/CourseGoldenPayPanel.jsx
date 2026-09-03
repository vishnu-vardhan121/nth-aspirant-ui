import { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  HiCheck,
  HiCheckCircle,
  HiClipboardDocument,
  HiClock,
  HiDevicePhoneMobile,
  HiLockClosed,
  HiSparkles,
} from 'react-icons/hi2';
import {
  chooseCoursePack,
  createCoursePaymentOrder,
  formatInr,
  getMyCoursePaymentOrder,
  submitCoursePaymentProof,
  uploadCoursePaymentScreenshot,
} from '../../lib/courses';
import { supabase } from '../../lib/supabase';
import { buildUpiPayUri, formatOrderReference } from '../../pages/dashboard/subscription/lib/upi';
import StaffFormModal from './StaffFormModal';
import RequestSubmittedModal from './RequestSubmittedModal';

const PACKS = [
  {
    id: 'full',
    title: 'Full payment',
    blurb: 'Pay once — simplest',
    badge: 'Best value',
  },
  {
    id: 'two',
    title: '2 installments',
    blurb: '1 month between payments',
    badge: 'Flexible',
  },
  {
    id: 'three',
    title: '3 installments',
    blurb: '1 month gaps',
    badge: 'Easy EMI',
  },
];

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:text-sm';

function packDetail(pricing, packId) {
  if (!pricing) return '';
  const two = Array.isArray(pricing.two_amounts_inr) ? pricing.two_amounts_inr : [];
  const three = Array.isArray(pricing.three_amounts_inr) ? pricing.three_amounts_inr : [];
  if (packId === 'full') return formatInr(pricing.full_amount_inr);
  if (packId === 'two') return `${formatInr(two[0])} now · ${formatInr(two[1])} next`;
  return `${formatInr(three[0])} now · ${formatInr(three[1])} · ${formatInr(three[2])}`;
}

function packNowAmount(pricing, packId) {
  if (!pricing) return null;
  const two = Array.isArray(pricing.two_amounts_inr) ? pricing.two_amounts_inr : [];
  const three = Array.isArray(pricing.three_amounts_inr) ? pricing.three_amounts_inr : [];
  if (packId === 'full') return pricing.full_amount_inr;
  if (packId === 'two') return two[0];
  return three[0];
}

function packAmounts(pricing, packId) {
  if (!pricing) return [];
  if (packId === 'full') return [pricing.full_amount_inr];
  if (packId === 'two') {
    return Array.isArray(pricing.two_amounts_inr) ? pricing.two_amounts_inr : [];
  }
  return Array.isArray(pricing.three_amounts_inr) ? pricing.three_amounts_inr : [];
}

/** Per-installment status list with a progress bar — replaces the old "X now · Y next" line. */
function InstallmentTracker({ pricing, packId, paidCount, totalCount, due, accessState }) {
  const amounts = packAmounts(pricing, packId);
  if (!amounts.length) return null;

  const total = totalCount || amounts.length;
  const progressPct = total ? Math.min(100, Math.round((paidCount / total) * 100)) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>Payment progress</span>
        <span className="tabular-nums">
          {paidCount}/{total} paid
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-[width]"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <ul className="space-y-2">
        {amounts.map((amt, i) => {
          const idx = i + 1;
          const isPaid = idx <= paidCount;
          const isNext = idx === paidCount + 1;
          const isOverdue = isNext && (due?.is_overdue || accessState === 'paused');

          let statusLabel = 'Upcoming';
          let statusClass = 'text-slate-400';
          if (isPaid) {
            statusLabel = 'Paid';
            statusClass = 'text-emerald-700';
          } else if (isOverdue) {
            statusLabel = 'Overdue';
            statusClass = 'text-red-600';
          } else if (isNext && due?.due_date_ist) {
            statusLabel = `Due ${due.due_date_ist}`;
            statusClass = 'text-amber-700';
          } else if (isNext) {
            statusLabel = 'Opens closer to due date';
            statusClass = 'text-amber-700';
          }

          return (
            <li
              key={idx}
              className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${
                isPaid
                  ? 'border-emerald-200 bg-emerald-50/60'
                  : isOverdue
                    ? 'border-red-200 bg-red-50/60'
                    : isNext
                      ? 'border-amber-200 bg-amber-50/70'
                      : 'border-slate-200 bg-slate-50/60'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isPaid
                      ? 'bg-emerald-600 text-white'
                      : isOverdue
                        ? 'bg-red-500 text-white'
                        : isNext
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isPaid ? <HiCheck className="h-4 w-4" aria-hidden /> : idx}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Installment {idx}</p>
                  <p className={`text-xs ${statusClass}`}>{statusLabel}</p>
                </div>
              </div>
              <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">
                {formatInr(amt)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CopyRow({ label, value, copied, onCopy }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="break-all text-sm font-semibold text-slate-900">{value}</p>
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
            Copied
          </>
        ) : (
          <>
            <HiClipboardDocument className="h-4 w-4" aria-hidden />
            Copy
          </>
        )}
      </button>
    </div>
  );
}

/**
 * Aspirant Golden pay: pack modal → UPI QR → UTR + screenshot proof (like Silver).
 */
export default function CourseGoldenPayPanel({ courseId, onUpdated }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [member, setMember] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [order, setOrder] = useState(null);
  const [due, setDue] = useState(null);

  const [packOpen, setPackOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState('full');

  const [payOpen, setPayOpen] = useState(false);
  const [utr, setUtr] = useState('');
  const [note, setNote] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderUpiId, setSenderUpiId] = useState('');
  const [paymentApp, setPaymentApp] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(null);
  const [submittedOpen, setSubmittedOpen] = useState(false);

  const load = useCallback(async ({ soft = false } = {}) => {
    if (!courseId) return null;
    if (!soft) {
      setLoading(true);
      setMsg({ type: '', text: '' });
    }
    const res = await getMyCoursePaymentOrder(courseId);
    if (!soft) setLoading(false);
    if (!res.ok) {
      if (!soft) setMsg({ type: 'error', text: res.error || 'Could not load payment' });
      return null;
    }
    setMember(res.member || null);
    setPricing(res.pricing || null);
    setOrder(res.order || null);
    setDue(res.due || null);
    if (res.member?.chosen_pack) setSelectedPack(res.member.chosen_pack);
    return res;
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const upiUri = useMemo(() => {
    if (!order || !pricing?.upi_id) return null;
    return buildUpiPayUri({
      upiId: pricing.upi_id,
      payeeName: pricing.upi_payee_name,
      amountInr: order.amount_inr,
      transactionNote: formatOrderReference(order.id),
    });
  }, [order, pricing]);

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
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const resetPayForm = () => {
    setUtr('');
    setNote('');
    setSenderName('');
    setSenderUpiId('');
    setPaymentApp('');
    setScreenshotFile(null);
    setFileError('');
    setConfirmed(false);
  };

  const confirmPack = async () => {
    setBusy('pack');
    setMsg({ type: '', text: '' });
    try {
      const res = await chooseCoursePack(courseId, selectedPack);
      if (!res.ok) {
        setMsg({ type: 'error', text: res.error || 'Could not save pack' });
        return;
      }

      resetPayForm();
      const orderRes = await createCoursePaymentOrder(courseId);
      if (!orderRes.ok) {
        setMsg({ type: 'error', text: orderRes.error || 'Could not start payment' });
        // Keep pack modal open so user can retry
        await load({ soft: true });
        return;
      }

      setOrder(orderRes.order);
      if (orderRes.upi_id) {
        setPricing((p) => ({
          ...(p || {}),
          upi_id: orderRes.upi_id,
          upi_payee_name: orderRes.upi_payee_name,
          instructions: orderRes.instructions,
        }));
      }
      // Open pay first, then soft-refresh — never full-page load (that unmounted the modal)
      setPackOpen(false);
      setPayOpen(true);
      await load({ soft: true });
      onUpdated?.();
    } catch (e) {
      setMsg({ type: 'error', text: e?.message || 'Could not continue to payment' });
    } finally {
      setBusy('');
    }
  };

  const openJoinFlow = () => {
    setSelectedPack(member?.chosen_pack || 'full');
    setMsg({ type: '', text: '' });
    setPackOpen(true);
  };

  const startPay = async () => {
    // First payment: always show packs first (change allowed)
    const firstPay =
      member?.access_state === 'awaiting_payment' ||
      Number(member?.installments_paid || 0) === 0;
    if (firstPay) {
      openJoinFlow();
      return;
    }
    setBusy('order');
    setMsg({ type: '', text: '' });
    resetPayForm();
    const res = await createCoursePaymentOrder(courseId);
    setBusy('');
    if (!res.ok) {
      setMsg({ type: 'error', text: res.error || 'Could not start payment' });
      return;
    }
    setOrder(res.order);
    if (res.upi_id) {
      setPricing((p) => ({
        ...(p || {}),
        upi_id: res.upi_id,
        upi_payee_name: res.upi_payee_name,
        instructions: res.instructions,
      }));
    }
    setPayOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setFileError('');
    if (!file) {
      setScreenshotFile(null);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setScreenshotFile(null);
      setFileError('File must be 5 MB or smaller.');
      e.target.value = '';
      return;
    }
    if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
      setScreenshotFile(null);
      setFileError('Use JPG, PNG, WebP, or PDF.');
      e.target.value = '';
      return;
    }
    setScreenshotFile(file);
  };

  const submitProof = async () => {
    if (!order?.id) return;
    const trimmed = utr.trim();
    const trimmedSenderName = senderName.trim();
    const trimmedSenderUpi = senderUpiId.trim();
    if (trimmed.length < 6) {
      setMsg({ type: 'error', text: 'Enter a valid UTR / transaction ID.' });
      return;
    }
    if (!trimmedSenderName) {
      setMsg({ type: 'error', text: 'Enter the sender name as per the bank account.' });
      return;
    }
    if (!screenshotFile) {
      setMsg({ type: 'error', text: 'Upload a payment screenshot.' });
      return;
    }
    if (!confirmed) {
      setMsg({ type: 'error', text: 'Confirm the amount paid.' });
      return;
    }

    setBusy('submit');
    setMsg({ type: '', text: '' });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      setBusy('');
      setMsg({ type: 'error', text: 'Not signed in' });
      return;
    }

    const up = await uploadCoursePaymentScreenshot(user.id, order.id, screenshotFile);
    if (!up.ok) {
      setBusy('');
      setMsg({ type: 'error', text: up.error || 'Screenshot upload failed' });
      return;
    }

    const res = await submitCoursePaymentProof(
      order.id,
      trimmed,
      note,
      up.path,
      trimmedSenderName,
      trimmedSenderUpi,
      paymentApp
    );
    setBusy('');
    if (!res.ok) {
      setMsg({ type: 'error', text: res.error || 'Submit failed' });
      return;
    }
    setPayOpen(false);
    resetPayForm();
    setMsg({ type: '', text: '' });
    setSubmittedOpen(true);
    await load({ soft: true });
    onUpdated?.();
  };

  if (loading) {
    return <p className="mt-2 text-sm text-slate-500">Loading payment…</p>;
  }

  if (!pricing) {
    return (
      <p className="mt-2 text-sm text-amber-800">
        Pricing not set yet. Please wait for admin to configure packs.
      </p>
    );
  }

  const chosen = member?.chosen_pack;
  const orderStatus = order?.status;
  const accessState = member?.access_state;
  const canPayNext = Boolean(due?.can_pay_next);
  const showPackPicker = accessState === 'awaiting_payment' && !chosen;
  const paidCount = Number(member?.installments_paid || 0);
  const nextInstallment = paidCount + 1;
  const isFirstPayment = accessState === 'awaiting_payment' || paidCount === 0;
  const installmentLabel =
    order?.installment_index || nextInstallment;

  const openPackCta = isFirstPayment ? 'View packs & join Golden' : 'View packs';
  const payCta = (() => {
    if (busy === 'order') return 'Opening…';
    if (isFirstPayment) return 'Choose pack & pay';
    if (accessState === 'paused') return `Pay overdue installment ${nextInstallment}`;
    return `Pay installment ${nextInstallment}`;
  })();
  const payModalTitle = isFirstPayment
    ? 'Join Golden access'
    : `Pay installment ${installmentLabel}`;
  const payModalSubtitle = isFirstPayment
    ? `First payment · ${formatInr(order?.amount_inr)}`
    : `Installment ${installmentLabel} · ${formatInr(order?.amount_inr)}`;
  const submitCta = isFirstPayment
    ? 'Submit payment to join Golden'
    : `Submit installment ${installmentLabel} proof`;

  return (
    <div className="mt-1 space-y-3">
      {accessState === 'paused' ? (
        <p className="text-sm text-slate-700">
          Golden access is paused. Pay the due installment to restore Join and recordings after
          admin verifies.
        </p>
      ) : accessState === 'active' && !orderStatus && (due?.remaining_installments || 0) > 0 ? (
        <p className="text-sm text-slate-700">
          You’re on Golden access. When the next installment is due, pay it here.
        </p>
      ) : accessState === 'awaiting_payment' && !chosen ? (
        <p className="text-sm text-slate-700">
          You’re approved. Choose a pack and complete your first payment to join Golden access.
        </p>
      ) : accessState === 'awaiting_payment' && chosen && orderStatus !== 'submitted' ? (
        <p className="text-sm text-slate-700">
          Complete your first payment to unlock Golden access.
        </p>
      ) : null}

      {due?.is_overdue || accessState === 'paused' ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900">
          Installment {nextInstallment} is overdue — live join and recordings are paused until you
          pay and admin verifies.
        </div>
      ) : due?.reminder && orderStatus !== 'submitted' ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
          Installment {nextInstallment} due in{' '}
          {due.days_until_due === 0 ? 'today' : `${due.days_until_due} day(s)`}
          {due.due_date_ist ? ` (${due.due_date_ist})` : ''}. Pay early to avoid pause.
        </div>
      ) : null}

      {msg.text ? (
        <p className={`text-sm ${msg.type === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>
          {msg.text}
        </p>
      ) : null}

      {showPackPicker ? (
        <div className="rounded-xl border border-amber-200/80 bg-white px-3.5 py-3.5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Join Golden access</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Pick full payment or installments — then pay the first amount to join.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedPack('full');
              setPackOpen(true);
            }}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-500"
          >
            <HiSparkles className="h-4 w-4" aria-hidden />
            {openPackCta}
          </button>
        </div>
      ) : chosen && orderStatus === 'submitted' ? (
        <div className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
          <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 to-white px-3.5 py-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <HiClock className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">
                  {isFirstPayment ? 'Payment under verification' : 'Installment under verification'}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Verification usually takes up to{' '}
                  <span className="font-semibold text-slate-800">48 hours</span>. Please check the
                  app for updates.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-2 px-3.5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-slate-500">Pack</span>
              <span className="font-semibold text-slate-900">
                {PACKS.find((p) => p.id === chosen)?.title || chosen}
                {member?.installments_total
                  ? ` · ${paidCount}/${member.installments_total}`
                  : ''}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-slate-500">Amount</span>
              <span className="font-semibold tabular-nums text-slate-900">
                {formatInr(order?.amount_inr)}
              </span>
            </div>
            {order?.utr ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-slate-500">UTR</span>
                <span className="font-mono text-xs font-semibold text-slate-800">{order.utr}</span>
              </div>
            ) : null}
            {order?.sender_name ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-slate-500">Sender name</span>
                <span className="font-semibold text-slate-800">{order.sender_name}</span>
              </div>
            ) : null}
            {order?.sender_upi_id ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-slate-500">Sender UPI ID</span>
                <span className="font-mono text-xs font-semibold text-slate-800">
                  {order.sender_upi_id}
                </span>
              </div>
            ) : null}
            <p className="rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-500">
              Status: submitted · waiting for admin approval
            </p>
          </div>
        </div>
      ) : chosen ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white px-3.5 py-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">
              {PACKS.find((p) => p.id === chosen)?.title || chosen}
            </p>
            {accessState === 'completed' || (due?.remaining_installments || 0) === 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                <HiCheck className="h-3.5 w-3.5" aria-hidden />
                All paid
              </span>
            ) : null}
          </div>

          <InstallmentTracker
            pricing={pricing}
            packId={chosen}
            paidCount={paidCount}
            totalCount={member?.installments_total}
            due={due}
            accessState={accessState}
          />

          {canPayNext ? (
            <button
              type="button"
              disabled={busy === 'order' || busy === 'pack'}
              onClick={startPay}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-60"
            >
              {payCta}
            </button>
          ) : null}
        </div>
      ) : null}

      <StaffFormModal
        open={packOpen}
        onClose={() => !busy && setPackOpen(false)}
        title="Choose your plan"
        subtitle="Golden access · Naveen Talent Hub"
        branded
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Select how you want to pay. You can change this until your first payment is approved.
          </p>
          <ul className="space-y-2.5">
            {PACKS.map((p) => {
              const active = selectedPack === p.id;
              const nowAmt = packNowAmount(pricing, p.id);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedPack(p.id)}
                    className={`w-full rounded-2xl border px-4 py-3.5 text-left transition ${
                      active
                        ? 'border-indigo-400 bg-gradient-to-br from-indigo-50 to-white shadow-sm ring-2 ring-indigo-200'
                        : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{p.title}</span>
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                            {p.badge}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{p.blurb}</p>
                        <p className="mt-2 text-sm text-slate-700">{packDetail(pricing, p.id)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Pay now
                        </p>
                        <p className="text-lg font-black tabular-nums text-indigo-800">
                          {formatInr(nowAmt)}
                        </p>
                        {active ? (
                          <HiCheckCircle
                            className="ml-auto mt-1 h-5 w-5 text-indigo-600"
                            aria-hidden
                          />
                        ) : null}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            disabled={busy === 'pack' || !selectedPack}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              confirmPack();
            }}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
          >
            {busy === 'pack' ? 'Opening checkout…' : 'Continue to checkout'}
          </button>
          {msg.text && packOpen ? (
            <p className={`text-sm ${msg.type === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>
              {msg.text}
            </p>
          ) : null}
        </div>
      </StaffFormModal>

      <StaffFormModal
        open={payOpen && Boolean(order)}
        onClose={() => {
          if (!busy) {
            setPayOpen(false);
            resetPayForm();
          }
        }}
        title={payModalTitle}
        subtitle={payModalSubtitle}
        branded
        size="checkout"
        footer={
          <button
            type="button"
            disabled={
              busy === 'submit' ||
              utr.trim().length < 6 ||
              !senderName.trim() ||
              !screenshotFile ||
              !confirmed ||
              Boolean(fileError)
            }
            onClick={submitProof}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-60"
          >
            {busy === 'submit' ? 'Submitting…' : submitCta}
          </button>
        }
      >
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 py-4 text-white shadow-lg sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-200/90">
                    {isFirstPayment ? 'Amount payable' : `Installment ${installmentLabel}`}
                  </p>
                  <p className="mt-1 text-3xl font-black tabular-nums tracking-tight sm:text-4xl">
                    {formatInr(order?.amount_inr)}
                  </p>
                  <p className="mt-1.5 text-sm text-indigo-100/80">
                    {pricing.upi_payee_name || 'Naveen Talent Hub'}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-100 ring-1 ring-white/15">
                  <HiLockClosed className="h-3 w-3" aria-hidden />
                  Secure
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  1 · Pay via UPI
                </p>
              </div>
              <div className="flex flex-col items-center gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-5 lg:flex-col xl:flex-row xl:items-start">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="UPI payment QR code"
                    className="h-40 w-40 shrink-0 rounded-2xl border-4 border-white bg-white p-1 shadow-md ring-1 ring-slate-200 sm:h-44 sm:w-44"
                  />
                ) : (
                  <div className="flex h-40 w-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 sm:h-44 sm:w-44">
                    Generating QR…
                  </div>
                )}
                <div className="w-full min-w-0 space-y-2">
                  <CopyRow
                    label="UPI ID"
                    value={pricing.upi_id || '—'}
                    copied={copied === 'upi'}
                    onCopy={() => copyText('upi', pricing.upi_id || '')}
                  />
                  <CopyRow
                    label="Payment note"
                    value={formatOrderReference(order?.id)}
                    copied={copied === 'ref'}
                    onCopy={() => copyText('ref', formatOrderReference(order?.id))}
                  />
                  {upiUri ? (
                    <a
                      href={upiUri}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                    >
                      <HiDevicePhoneMobile className="h-5 w-5" aria-hidden />
                      Open UPI app
                    </a>
                  ) : null}
                </div>
              </div>
              {pricing.instructions ? (
                <p className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-xs leading-relaxed text-slate-600">
                  {pricing.instructions}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 space-y-4 lg:mt-0">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  2 · Submit payment proof
                </p>
              </div>
              <div className="space-y-3.5 px-4 py-4">
                {msg.text && payOpen ? (
                  <p
                    className={`rounded-lg px-3 py-2 text-sm ${
                      msg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    {msg.text}
                  </p>
                ) : null}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-800">
                    UTR / Transaction ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value.toUpperCase().slice(0, 64))}
                    className={fieldClass}
                    placeholder="e.g. 123456789012"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-800">
                    Sender name (as per bank account) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value.slice(0, 120))}
                    className={fieldClass}
                    placeholder="Name shown on your bank account / UPI app"
                    autoComplete="off"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="h-px flex-1 bg-slate-100" aria-hidden />
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Optional details
                  </p>
                  <span className="h-px flex-1 bg-slate-100" aria-hidden />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">
                    Sender UPI ID
                  </label>
                  <input
                    type="text"
                    value={senderUpiId}
                    onChange={(e) => setSenderUpiId(e.target.value.slice(0, 120))}
                    className={fieldClass}
                    placeholder="e.g. name@okhdfcbank"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">
                    Payment app
                  </label>
                  <select
                    value={paymentApp}
                    onChange={(e) => setPaymentApp(e.target.value)}
                    className={`${fieldClass} appearance-none bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%2394a3b8%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.1rem] bg-[right_0.75rem_center] bg-no-repeat pr-9`}
                  >
                    <option value="">Not specified</option>
                    <option value="gpay">Google Pay</option>
                    <option value="phonepe">PhonePe</option>
                    <option value="paytm">Paytm</option>
                    <option value="bhim">BHIM</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">
                    Note
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 200))}
                    className={fieldClass}
                    placeholder="Any extra detail for our team"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-800">
                    Payment screenshot <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2.5 file:text-sm file:font-semibold file:text-indigo-700"
                  />
                  {screenshotFile ? (
                    <p className="mt-1.5 truncate text-xs text-emerald-700">
                      Selected: {screenshotFile.name}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-slate-500">JPG, PNG, WebP, or PDF · max 5 MB</p>
                  )}
                  {fileError ? <p className="mt-1.5 text-xs text-red-600">{fileError}</p> : null}
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-indigo-600"
                  />
                  <span className="text-sm leading-snug text-slate-700">
                    I confirm I paid exactly{' '}
                    <strong className="font-semibold text-slate-900">
                      {formatInr(order?.amount_inr)}
                    </strong>{' '}
                    to the UPI ID shown.
                  </span>
                </label>
              </div>
            </div>

            <p className="hidden items-center justify-center gap-1.5 text-center text-[11px] text-slate-400 lg:flex">
              <HiLockClosed className="h-3.5 w-3.5" aria-hidden />
              Verified manually by NTH · Golden access checkout
            </p>
          </div>
        </div>
      </StaffFormModal>

      <RequestSubmittedModal
        open={submittedOpen}
        onClose={() => setSubmittedOpen(false)}
        title="Payment submitted for verification"
        body="Your UPI payment proof has been received. Our team will verify the amount and update your access."
        hours={48}
      />
    </div>
  );
}
