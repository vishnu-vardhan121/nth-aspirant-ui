const PLAN_LABELS = { base: 'Base', silver: 'Silver', gold: 'Gold' };

const STATUS_META = {
  pending: {
    label: 'Awaiting proof',
    description: 'Payment started but proof was not submitted yet.',
    badgeClass: 'bg-slate-100 text-slate-700 ring-slate-200/80',
    accentClass: 'border-l-slate-300',
  },
  submitted: {
    label: 'Under review',
    description: 'We are verifying your UPI payment. This usually takes up to 24 hours on business days.',
    badgeClass: 'bg-amber-50 text-amber-900 ring-amber-200/80',
    accentClass: 'border-l-amber-400',
  },
  approved: {
    label: 'Approved',
    description: 'Payment verified and your plan was activated.',
    badgeClass: 'bg-emerald-50 text-emerald-800 ring-emerald-200/80',
    accentClass: 'border-l-emerald-500',
  },
  rejected: {
    label: 'Rejected',
    description: 'This payment could not be verified. See the note below or submit a new payment.',
    badgeClass: 'bg-red-50 text-red-800 ring-red-200/80',
    accentClass: 'border-l-red-400',
  },
};

export function getPaymentPlanLabel(plan) {
  const key = String(plan ?? '').toLowerCase();
  return PLAN_LABELS[key] ?? plan ?? '—';
}

export function formatPaymentPlanLine(plan, durationMonths) {
  const name = getPaymentPlanLabel(plan);
  const months = Number(durationMonths);
  if (!Number.isFinite(months) || months <= 0) return name;
  const duration = months === 1 ? '1 month' : `${months} months`;
  return `${name} · ${duration}`;
}

/** @param {string | null | undefined} status */
export function getPaymentStatusMeta(status) {
  const key = String(status ?? '').toLowerCase();
  return STATUS_META[key] ?? {
    label: status || 'Unknown',
    description: '',
    badgeClass: 'bg-slate-100 text-slate-700 ring-slate-200/80',
    accentClass: 'border-l-slate-300',
  };
}

export function formatPaymentDate(iso) {
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
