import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppSelector } from '../../../store/hooks';
import { supabase } from '../../../lib/supabase';
import { PageLoader } from '../../../components/ui/Loader';
import { PLAN_VALIDITY_MONTHS } from '../../../lib/planLimits';
import {
  formatPaymentDate,
  formatPaymentPlanLine,
  getPaymentStatusMeta,
} from '../../../lib/paymentOrderDisplay';
import { formatInr, usePlanModal, useSubscriptionStatus } from '../subscription';
import { fetchMyPaymentOrders, PAYMENT_PROOFS_BUCKET } from '../subscription/api/paymentOrders';
import {
  HiArrowPath,
  HiCheckBadge,
  HiChevronRight,
  HiClock,
  HiCreditCard,
  HiExclamationTriangle,
  HiXCircle,
  HiXMark,
} from 'react-icons/hi2';

const FILTER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'Under review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const PLAN_LABELS = { base: 'Base', silver: 'Silver', gold: 'Gold' };

function formatShortDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getPlanExpiry(plan, planStartedAt) {
  if (!plan || !planStartedAt) return null;
  const months = PLAN_VALIDITY_MONTHS[plan];
  if (!months) return null;
  const end = new Date(planStartedAt);
  end.setMonth(end.getMonth() + months);
  return end;
}

function PaymentDetailModal({ order, onClose }) {
  const [proofUrl, setProofUrl] = useState(null);

  useEffect(() => {
    if (!order?.screenshot_path) {
      setProofUrl(null);
      return undefined;
    }
    let cancelled = false;
    supabase.storage
      .from(PAYMENT_PROOFS_BUCKET)
      .createSignedUrl(order.screenshot_path, 3600)
      .then(({ data }) => {
        if (!cancelled) setProofUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [order?.screenshot_path]);

  if (!order) return null;

  const meta = getPaymentStatusMeta(order.status);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-detail-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment details</p>
            <h2 id="payment-detail-title" className="mt-1 text-lg font-bold text-slate-900">
              {formatPaymentPlanLine(order.plan, order.duration_months)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${meta.badgeClass}`}
            >
              {meta.label}
            </span>
            <span className="text-sm font-semibold text-slate-900">{formatInr(order.amount_inr)}</span>
          </div>

          {meta.description ? (
            <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-sm leading-relaxed text-slate-600">
              {meta.description}
            </p>
          ) : null}

          <dl className="grid gap-3 text-sm">
            <DetailRow label="Submitted on" value={formatPaymentDate(order.created_at)} />
            {order.reviewed_at ? (
              <DetailRow label="Reviewed on" value={formatPaymentDate(order.reviewed_at)} />
            ) : null}
            <DetailRow label="Transaction ID (UTR)" value={order.utr} mono />
            {order.payer_note ? <DetailRow label="Your note" value={order.payer_note} /> : null}
            {order.status === 'rejected' && order.admin_notes ? (
              <DetailRow label="Reason" value={order.admin_notes} highlight />
            ) : null}
          </dl>

          {proofUrl ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Payment proof</p>
              {order.screenshot_path?.endsWith('.pdf') ? (
                <a
                  href={proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-indigo-600 hover:underline"
                >
                  Open PDF proof
                </a>
              ) : (
                <a href={proofUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={proofUrl}
                    alt="Payment proof"
                    className="max-h-56 w-full rounded-xl border border-slate-200 object-contain bg-slate-50"
                  />
                </a>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono = false, highlight = false }) {
  const display = value?.trim?.() ? value : value || '—';
  return (
    <div className={`rounded-xl px-3.5 py-3 ${highlight ? 'bg-red-50 ring-1 ring-red-100' : 'bg-slate-50'}`}>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd
        className={`mt-1 font-medium text-slate-900 ${mono ? 'font-mono text-xs break-all' : 'text-sm'} ${
          highlight ? 'text-red-800' : ''
        }`}
      >
        {display}
      </dd>
    </div>
  );
}

export default function PaymentsPage() {
  const userId = useAppSelector((state) => state.auth.user?.id);
  const { openPlanModal } = usePlanModal();
  const { plan, planStartedAt, hasActivePlan, showPlanAction } = useSubscriptionStatus();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const rows = await fetchMyPaymentOrders();
      setOrders(rows);
    } catch (e) {
      setError(e.message || 'Could not load payments.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!userId) return undefined;

    const channel = supabase
      .channel(`aspirant-payments-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_orders',
          filter: `aspirant_id=eq.${userId}`,
        },
        () => {
          load();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const pendingReview = useMemo(
    () => orders.filter((o) => o.status === 'submitted'),
    [orders],
  );

  const rejectedOrders = useMemo(
    () => orders.filter((o) => o.status === 'rejected'),
    [orders],
  );

  const latestRejected = rejectedOrders[0] ?? null;

  const filteredOrders = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const planExpiry = getPlanExpiry(plan, planStartedAt);
  const planLabel = hasActivePlan ? PLAN_LABELS[plan] ?? plan : null;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
              <HiCreditCard className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[rgb(var(--nth-text-primary-light))]">
                My payments
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
                Track UPI payment status, verification updates, and your subscription history.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                load();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <HiArrowPath className="h-4 w-4" />
              Refresh
            </button>
            {showPlanAction ? (
              <button type="button" onClick={openPlanModal} className="nth-btn-primary px-4 py-2 text-sm font-semibold">
                {hasActivePlan ? 'Upgrade plan' : 'Choose a plan'}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <SummaryCard
            label="Current plan"
            value={planLabel ?? 'No active plan'}
            note={
              hasActivePlan && planExpiry
                ? `Valid until ${formatShortDate(planExpiry.toISOString())}`
                : 'Subscribe to unlock mocks and job applications'
            }
            icon={HiCheckBadge}
            tone={hasActivePlan ? 'success' : 'muted'}
          />
          <SummaryCard
            label="Under review"
            value={String(pendingReview.length)}
            note={pendingReview.length ? 'We will notify you once verified' : 'No payments awaiting verification'}
            icon={HiClock}
            tone={pendingReview.length ? 'warning' : 'muted'}
          />
          <SummaryCard
            label="Rejected"
            value={String(rejectedOrders.length)}
            note={
              rejectedOrders.length
                ? 'See the reason below and submit again if needed'
                : 'No rejected payments'
            }
            icon={HiXCircle}
            tone={rejectedOrders.length ? 'danger' : 'muted'}
          />
        </div>
      </section>

      {latestRejected ? (
        <div className="overflow-hidden rounded-xl border border-red-200 bg-red-50 shadow-sm">
          <div className="flex gap-3 border-b border-red-200/80 bg-red-100/60 px-4 py-3.5">
            <HiXCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-red-950">Payment rejected</p>
              <p className="mt-0.5 text-sm text-red-800">
                {formatPaymentPlanLine(latestRejected.plan, latestRejected.duration_months)} ·{' '}
                {formatInr(latestRejected.amount_inr)} · {formatShortDate(latestRejected.reviewed_at || latestRejected.created_at)}
              </p>
            </div>
            {showPlanAction ? (
              <button
                type="button"
                onClick={openPlanModal}
                className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-500"
              >
                Pay again
              </button>
            ) : null}
          </div>
          <div className="px-4 py-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Reason</p>
            <p className="mt-1.5 text-sm font-medium leading-relaxed text-red-900">
              {latestRejected.admin_notes?.trim() ||
                'We could not verify this payment. Please check your UTR and try again.'}
            </p>
            {rejectedOrders.length > 1 ? (
              <button
                type="button"
                onClick={() => setFilter('rejected')}
                className="mt-3 text-xs font-semibold text-red-700 underline-offset-2 hover:underline"
              >
                View all {rejectedOrders.length} rejected payments
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {pendingReview.length > 0 ? (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-950">
          <HiExclamationTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <p>
            <span className="font-semibold">Payment under verification.</span>{' '}
            {pendingReview.length === 1
              ? 'Your latest UPI payment is being reviewed. You do not need to pay again.'
              : `${pendingReview.length} payments are being reviewed. You do not need to pay again.`}
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-slate-900">Payment history</h2>
          <div className="flex flex-wrap gap-1.5">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilter(tab.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filter === tab.value
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <PageLoader size="md" label="Loading payments…" className="py-12" variant="dots" />
        ) : filteredOrders.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <HiCreditCard className="h-7 w-7" />
            </div>
            <p className="mt-4 text-base font-semibold text-slate-900">No payments yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              {filter === 'all'
                ? 'When you pay for a plan via UPI, your orders and verification status will appear here.'
                : 'No payments match this filter.'}
            </p>
            {filter === 'all' && showPlanAction ? (
              <button
                type="button"
                onClick={openPlanModal}
                className="nth-btn-primary mt-5 px-5 py-2.5 text-sm font-semibold"
              >
                Browse plans
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredOrders.map((order) => {
              const meta = getPaymentStatusMeta(order.status);
              return (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(order)}
                    className={`flex w-full items-center gap-4 border-l-4 px-4 py-4 text-left transition-colors hover:bg-slate-50/80 sm:px-5 ${meta.accentClass} ${
                      order.status === 'rejected' ? 'bg-red-50/70 hover:bg-red-50' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          {formatPaymentPlanLine(order.plan, order.duration_months)}
                        </p>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatInr(order.amount_inr)}
                        <span className="mx-1.5 text-slate-300">·</span>
                        {formatShortDate(order.created_at)}
                        {order.utr ? (
                          <>
                            <span className="mx-1.5 text-slate-300">·</span>
                            <span className="font-mono text-xs">UTR …{String(order.utr).slice(-6)}</span>
                          </>
                        ) : null}
                      </p>
                      {order.status === 'rejected' ? (
                        <div className="mt-2 rounded-lg border border-red-200 bg-red-100/80 px-2.5 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-red-700">Reason</p>
                          <p className="mt-0.5 line-clamp-2 text-xs font-medium text-red-900">
                            {order.admin_notes?.trim() ||
                              'We could not verify this payment. Please check your UTR and try again.'}
                          </p>
                        </div>
                      ) : null}
                    </div>
                    <HiChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <PaymentDetailModal order={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function SummaryCard({ label, value, note, icon: Icon, tone = 'muted' }) {
  const toneClasses = {
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    warning: 'bg-amber-50 text-amber-700 ring-amber-100',
    danger: 'bg-red-50 text-red-700 ring-red-100',
    muted: 'bg-slate-50 text-slate-600 ring-slate-100',
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${toneClasses[tone] ?? toneClasses.muted}`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-0.5 text-lg font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{note}</p>
        </div>
      </div>
    </div>
  );
}
