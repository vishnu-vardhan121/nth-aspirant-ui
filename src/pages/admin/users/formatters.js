export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function mockStatusBadgeClass(status) {
  const map = {
    completed: 'bg-emerald-100 text-emerald-800',
    scheduled: 'bg-blue-100 text-blue-800',
    requested: 'bg-amber-100 text-amber-800',
    cancelled: 'bg-slate-100 text-slate-600',
    no_show: 'bg-red-100 text-red-700',
  };
  return map[status] ?? 'bg-slate-100 text-slate-600';
}

export function mockStatusLabel(status) {
  if (!status) return '—';
  const map = {
    requested: 'Requested',
    scheduled: 'Scheduled',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No show',
  };
  return map[status] ?? status;
}
