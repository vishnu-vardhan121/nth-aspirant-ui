import { useEffect, useState } from 'react';
import {
  adminGetCoursePricing,
  adminUpsertCoursePricing,
  formatInr,
} from '../../lib/courses';

const fieldClass =
  'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm';

function emptyForm() {
  return {
    fullAmountInr: '',
    two1: '',
    two2: '',
    three1: '',
    three2: '',
    three3: '',
    upiId: '',
    upiPayeeName: '',
    instructions: '',
  };
}

function fromPricing(p) {
  if (!p) return emptyForm();
  const two = Array.isArray(p.two_amounts_inr) ? p.two_amounts_inr : [];
  const three = Array.isArray(p.three_amounts_inr) ? p.three_amounts_inr : [];
  return {
    fullAmountInr: p.full_amount_inr ?? '',
    two1: two[0] ?? '',
    two2: two[1] ?? '',
    three1: three[0] ?? '',
    three2: three[1] ?? '',
    three3: three[2] ?? '',
    upiId: p.upi_id || '',
    upiPayeeName: p.upi_payee_name || '',
    instructions: p.instructions || '',
  };
}

/** Admin: configure full / 2× / 3× packs + course-only UPI. */
export default function CoursePricingPanel({ courseId }) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [hasPricing, setHasPricing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!courseId) return;
      setLoading(true);
      setMsg({ type: '', text: '' });
      const res = await adminGetCoursePricing(courseId);
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setMsg({ type: 'error', text: res.error || 'Failed to load pricing' });
        return;
      }
      setHasPricing(Boolean(res.pricing));
      setForm(fromPricing(res.pricing));
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    const full = Number(form.fullAmountInr);
    const two = [Number(form.two1), Number(form.two2)];
    const three = [Number(form.three1), Number(form.three2), Number(form.three3)];
    if (!Number.isFinite(full) || full <= 0) {
      setMsg({ type: 'error', text: 'Enter a valid full payment amount.' });
      return;
    }
    if (two.some((n) => !Number.isFinite(n) || n <= 0)) {
      setMsg({ type: 'error', text: 'Enter two valid amounts for the 2× pack.' });
      return;
    }
    if (three.some((n) => !Number.isFinite(n) || n <= 0)) {
      setMsg({ type: 'error', text: 'Enter three valid amounts for the 3× pack.' });
      return;
    }
    if (!form.upiId.trim() || !form.upiPayeeName.trim()) {
      setMsg({ type: 'error', text: 'Course UPI ID and payee name are required.' });
      return;
    }

    setBusy(true);
    const res = await adminUpsertCoursePricing(courseId, {
      fullAmountInr: Math.round(full),
      twoAmountsInr: two.map((n) => Math.round(n)),
      threeAmountsInr: three.map((n) => Math.round(n)),
      upiId: form.upiId.trim(),
      upiPayeeName: form.upiPayeeName.trim(),
      instructions: form.instructions.trim() || null,
    });
    setBusy(false);
    if (!res.ok) {
      setMsg({ type: 'error', text: res.error || 'Save failed' });
      return;
    }
    setHasPricing(true);
    setForm(fromPricing(res.pricing));
    setMsg({ type: 'success', text: 'Pricing saved. Separate from placement UPI.' });
  };

  if (loading) return <p className="text-sm text-slate-500">Loading pricing…</p>;

  return (
    <form onSubmit={save} className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Golden packs &amp; course UPI</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Admin sets prices. Installment gap is fixed at 1 month. This UPI is only for course
          payments — not placement subscription.
          {hasPricing ? '' : ' No pricing saved yet.'}
        </p>
      </div>

      {msg.text ? (
        <p className={`text-sm ${msg.type === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>
          {msg.text}
        </p>
      ) : null}

      <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-xs font-bold uppercase tracking-wide text-slate-500">
          Pack 1 — Full payment
        </legend>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Amount (INR)</span>
          <input
            type="number"
            min={1}
            step={1}
            value={form.fullAmountInr}
            onChange={set('fullAmountInr')}
            className={`mt-1 ${fieldClass}`}
            required
          />
          {form.fullAmountInr ? (
            <span className="mt-1 block text-xs text-slate-500">{formatInr(form.fullAmountInr)}</span>
          ) : null}
        </label>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-xs font-bold uppercase tracking-wide text-slate-500">
          Pack 2 — Two installments (1 month gap)
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">1st payment (INR)</span>
            <input
              type="number"
              min={1}
              step={1}
              value={form.two1}
              onChange={set('two1')}
              className={`mt-1 ${fieldClass}`}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">2nd payment (INR)</span>
            <input
              type="number"
              min={1}
              step={1}
              value={form.two2}
              onChange={set('two2')}
              className={`mt-1 ${fieldClass}`}
              required
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-xs font-bold uppercase tracking-wide text-slate-500">
          Pack 3 — Three installments (1 month gap)
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">1st (INR)</span>
            <input
              type="number"
              min={1}
              step={1}
              value={form.three1}
              onChange={set('three1')}
              className={`mt-1 ${fieldClass}`}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">2nd (INR)</span>
            <input
              type="number"
              min={1}
              step={1}
              value={form.three2}
              onChange={set('three2')}
              className={`mt-1 ${fieldClass}`}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">3rd (INR)</span>
            <input
              type="number"
              min={1}
              step={1}
              value={form.three3}
              onChange={set('three3')}
              className={`mt-1 ${fieldClass}`}
              required
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
        <legend className="px-1 text-xs font-bold uppercase tracking-wide text-amber-800">
          Course UPI (not placement)
        </legend>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">UPI ID</span>
          <input
            type="text"
            value={form.upiId}
            onChange={set('upiId')}
            className={`mt-1 ${fieldClass}`}
            placeholder="merchant@upi"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Payee name</span>
          <input
            type="text"
            value={form.upiPayeeName}
            onChange={set('upiPayeeName')}
            className={`mt-1 ${fieldClass}`}
            placeholder="Naveen Talent Hub"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Payment instructions (optional)</span>
          <textarea
            value={form.instructions}
            onChange={set('instructions')}
            rows={3}
            maxLength={2000}
            className={`mt-1 ${fieldClass}`}
            placeholder="e.g. Add your registered email in the UPI note"
          />
        </label>
      </fieldset>

      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 sm:w-auto"
      >
        {busy ? 'Saving…' : 'Save pricing'}
      </button>
    </form>
  );
}
