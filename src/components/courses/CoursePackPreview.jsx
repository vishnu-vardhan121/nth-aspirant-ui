import { useEffect, useState } from 'react';
import { formatInr, getMyCoursePricing } from '../../lib/courses';

/** Read-only pack preview for golden awaiting_payment (pay flow is G3). */
export default function CoursePackPreview({ courseId }) {
  const [pricing, setPricing] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!courseId) return;
      setLoading(true);
      setError('');
      const res = await getMyCoursePricing(courseId);
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(res.error || 'Pricing not available yet');
        setPricing(null);
        return;
      }
      setPricing(res.pricing);
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (loading) {
    return <p className="mt-2 text-sm text-slate-500">Loading packs…</p>;
  }

  if (error) {
    return <p className="mt-2 text-sm text-amber-800">{error}</p>;
  }

  if (!pricing) return null;

  const two = Array.isArray(pricing.two_amounts_inr) ? pricing.two_amounts_inr : [];
  const three = Array.isArray(pricing.three_amounts_inr) ? pricing.three_amounts_inr : [];

  const packs = [
    {
      id: 'full',
      title: 'Full payment',
      detail: formatInr(pricing.full_amount_inr),
    },
    {
      id: 'two',
      title: '2 installments',
      detail: `${formatInr(two[0])} now · ${formatInr(two[1])} after 1 month`,
    },
    {
      id: 'three',
      title: '3 installments',
      detail: `${formatInr(three[0])} now · then ${formatInr(three[1])} · ${formatInr(three[2])} (1 month gaps)`,
    },
  ];

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Packs (payment step next)
      </p>
      <ul className="space-y-2">
        {packs.map((p) => (
          <li
            key={p.id}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800"
          >
            <p className="font-semibold text-slate-900">{p.title}</p>
            <p className="mt-0.5 text-slate-600">{p.detail}</p>
          </li>
        ))}
      </ul>
      {pricing.instructions ? (
        <p className="text-xs text-slate-500">{pricing.instructions}</p>
      ) : null}
    </div>
  );
}
