import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { PageLoader, ButtonLoader } from '../../components/ui/Loader';
import { PAYMENT_PROOFS_BUCKET } from '../dashboard/subscription/api/paymentOrders';

const STATUS_TABS = [
  { value: 'submitted', label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'pending', label: 'Awaiting proof' },
  { value: '', label: 'All' },
];

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

function formatInr(amount) {
  if (amount == null) return '—';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

function statusClass(status) {
  if (status === 'approved') return 'bg-emerald-100 text-emerald-800';
  if (status === 'rejected') return 'bg-red-100 text-red-800';
  if (status === 'submitted') return 'bg-amber-100 text-amber-900';
  return 'bg-slate-100 text-slate-700';
}

function OrderDetailModal({ order, onClose, onReviewed }) {
  const [screenshotUrl, setScreenshotUrl] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!order?.screenshot_path) {
      setScreenshotUrl(null);
      return undefined;
    }
    let cancelled = false;
    supabase.storage
      .from(PAYMENT_PROOFS_BUCKET)
      .createSignedUrl(order.screenshot_path, 3600)
      .then(({ data }) => {
        if (!cancelled) setScreenshotUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [order?.screenshot_path]);

  const review = async (action) => {
    if (!order) return;
    if (action === 'reject' && !adminNotes.trim()) {
      setMessage({ type: 'error', text: 'Add a reason when rejecting.' });
      return;
    }
    setSubmitting(true);
    setMessage({ type: '', text: '' });
    const { data, error } = await supabase.rpc('admin_review_payment_order', {
      p_order_id: order.id,
      p_action: action,
      p_admin_notes: adminNotes.trim() || null,
    });
    setSubmitting(false);
    if (error || !data?.ok) {
      setMessage({ type: 'error', text: data?.error || error?.message || 'Action failed.' });
      return;
    }
    onReviewed?.();
    onClose();
  };

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose} role="presentation">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className="text-lg font-bold text-slate-900">Payment order</h2>
        <p className="mt-1 text-sm text-slate-600">
          {order.aspirant_name || '—'} · {order.aspirant_email || '—'}
        </p>

        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Plan" value={order.plan} />
          <Row label="Amount" value={formatInr(order.amount_inr)} />
          <Row label="Status" value={order.status} />
          <Row label="UTR" value={order.utr} mono />
          <Row label="Payer note" value={order.payer_note} />
          <Row label="Submitted" value={formatDate(order.updated_at)} />
        </dl>

        {screenshotUrl ? (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase text-slate-500 mb-2">Screenshot</p>
            {order.screenshot_path?.endsWith('.pdf') ? (
              <a href={screenshotUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 text-sm font-medium hover:underline">
                Open PDF proof
              </a>
            ) : (
              <a href={screenshotUrl} target="_blank" rel="noopener noreferrer">
                <img src={screenshotUrl} alt="Payment proof" className="max-h-64 rounded-lg border border-slate-200" />
              </a>
            )}
          </div>
        ) : order.screenshot_path ? (
          <p className="mt-4 text-sm text-slate-500">Loading screenshot…</p>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No screenshot uploaded.</p>
        )}

        {order.status === 'submitted' ? (
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Admin notes</label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={2}
              placeholder="Required if rejecting"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {message.text ? (
              <p className={`mt-2 text-sm ${message.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{message.text}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => review('approve')}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {submitting ? <ButtonLoader label="Approving…" /> : 'Approve & activate plan'}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => review('reject')}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
              >
                Reject
              </button>
              <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  const display = value == null || value === '' ? '—' : String(value);
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-1.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-right font-medium text-slate-900 ${mono ? 'font-mono text-xs break-all' : ''}`}>{display}</dd>
    </div>
  );
}

export default function AdminPaymentsPage() {
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_list_payment_orders', {
      p_status: statusFilter || null,
    });
    setLoading(false);
    if (error || !data?.ok) {
      setOrders([]);
      return;
    }
    setOrders(Array.isArray(data.orders) ? data.orders : []);
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Payments</h1>
      <p className="text-slate-600 mb-6">
        Review UPI payment proofs from aspirants. Approving activates their plan automatically.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value || 'all'}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader size="md" label="Loading payments…" className="py-12" />
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-500">
          No payment orders in this view.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">UTR</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{order.aspirant_name || '—'}</p>
                    <p className="text-xs text-slate-500">{order.aspirant_email}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{order.plan}</td>
                  <td className="px-4 py-3">{formatInr(order.amount_inr)}</td>
                  <td className="px-4 py-3 font-mono text-xs max-w-[120px] truncate" title={order.utr}>
                    {order.utr || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusClass(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(order)}
                      className="text-indigo-600 font-medium hover:underline"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <OrderDetailModal order={selected} onClose={() => setSelected(null)} onReviewed={load} />
    </div>
  );
}
