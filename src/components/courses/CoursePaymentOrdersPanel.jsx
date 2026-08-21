import { useCallback, useEffect, useState } from 'react';
import {
  adminListCoursePaymentOrders,
  adminReviewCoursePayment,
  formatInr,
  getCoursePaymentScreenshotUrl,
} from '../../lib/courses';
import StaffFormModal from './StaffFormModal';

/** Admin: verify course Golden payment submissions (UTR + screenshot). */
export default function CoursePaymentOrdersPanel({ courseId, onChanged }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('submitted');
  const [busyId, setBusyId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [shotUrl, setShotUrl] = useState(null);
  const [shotLoading, setShotLoading] = useState(false);

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError('');
    const res = await adminListCoursePaymentOrders(
      courseId,
      filter === 'all' ? null : filter
    );
    setLoading(false);
    if (!res.ok) {
      setError(res.error || 'Failed to load orders');
      setOrders([]);
      return;
    }
    setOrders(res.orders || []);
  }, [courseId, filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!detail?.screenshot_path) {
      setShotUrl(null);
      return undefined;
    }
    let cancelled = false;
    setShotLoading(true);
    getCoursePaymentScreenshotUrl(detail.screenshot_path).then((res) => {
      if (cancelled) return;
      setShotLoading(false);
      setShotUrl(res.ok ? res.url : null);
    });
    return () => {
      cancelled = true;
    };
  }, [detail?.screenshot_path]);

  const review = async (orderId, approve) => {
    setBusyId(orderId);
    const res = await adminReviewCoursePayment(orderId, approve);
    setBusyId(null);
    if (!res.ok) {
      window.alert(res.error || 'Review failed');
      return;
    }
    if (approve && res.gold_grant_ok === false) {
      window.alert(
        `Payment approved, but Gold plan grant failed: ${res.gold_grant_error || 'unknown'}`
      );
    }
    setDetail(null);
    await load();
    onChanged?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Course payments</h2>
          <p className="text-xs text-slate-500">
            Verify UTR, screenshot, amount, and pack. First approval unlocks Golden + Gold plan.
          </p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="submitted">Submitted</option>
          <option value="pending">Pending (not submitted)</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>

      {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error && orders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          No orders in this filter.
        </p>
      ) : null}

      {orders.length > 0 ? (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {orders.map((o) => (
            <li key={o.id} className="px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-slate-900">{o.aspirant_name || 'Aspirant'}</p>
                  <p className="text-xs text-slate-500">{o.aspirant_email}</p>
                  <p className="mt-1 text-slate-700">
                    Pack <span className="font-medium">{o.pack}</span> · installment{' '}
                    {o.installment_index} · {formatInr(o.amount_inr)}
                  </p>
                  <p className="text-slate-600">
                    Status: <span className="font-medium">{o.status}</span>
                    {o.utr ? (
                      <>
                        {' '}
                        · UTR <span className="font-mono font-medium">{o.utr}</span>
                      </>
                    ) : null}
                  </p>
                  {o.screenshot_path ? (
                    <p className="mt-0.5 text-xs font-medium text-emerald-700">Screenshot attached</p>
                  ) : o.status === 'submitted' ? (
                    <p className="mt-0.5 text-xs text-amber-700">No screenshot</p>
                  ) : null}
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:shrink-0">
                  <button
                    type="button"
                    onClick={() => setDetail(o)}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 sm:w-auto"
                  >
                    Review
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <StaffFormModal
        open={Boolean(detail)}
        onClose={() => !busyId && setDetail(null)}
        title="Verify course payment"
        subtitle={detail ? `${detail.aspirant_name || 'Aspirant'} · ${formatInr(detail.amount_inr)}` : ''}
        wide
      >
        {detail ? (
          <div className="space-y-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Email</dt>
                <dd className="text-right text-slate-900">{detail.aspirant_email || '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Pack</dt>
                <dd className="font-medium text-slate-900">
                  {detail.pack} · #{detail.installment_index}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Amount</dt>
                <dd className="font-semibold text-slate-900">{formatInr(detail.amount_inr)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">UTR</dt>
                <dd className="font-mono text-slate-900">{detail.utr || '—'}</dd>
              </div>
              {detail.payer_note ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Note</dt>
                  <dd className="text-right text-slate-700">{detail.payer_note}</dd>
                </div>
              ) : null}
            </dl>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Payment screenshot
              </p>
              {shotLoading ? (
                <p className="text-sm text-slate-500">Loading screenshot…</p>
              ) : shotUrl ? (
                detail.screenshot_path?.toLowerCase().endsWith('.pdf') ? (
                  <a
                    href={shotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-indigo-600 hover:underline"
                  >
                    Open PDF proof
                  </a>
                ) : (
                  <a href={shotUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <img
                      src={shotUrl}
                      alt="Payment proof"
                      className="max-h-72 w-full rounded-xl border border-slate-200 object-contain bg-slate-50"
                    />
                  </a>
                )
              ) : (
                <p className="text-sm text-slate-500">No screenshot uploaded.</p>
              )}
            </div>

            {detail.status === 'submitted' ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={busyId === detail.id}
                  onClick={() => review(detail.id, true)}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {busyId === detail.id ? 'Working…' : 'Approve'}
                </button>
                <button
                  type="button"
                  disabled={busyId === detail.id}
                  onClick={() => review(detail.id, false)}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Status: <span className="font-semibold">{detail.status}</span>
              </p>
            )}
          </div>
        ) : null}
      </StaffFormModal>
    </div>
  );
}
