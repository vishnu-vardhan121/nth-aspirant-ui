const STATUS_STYLES = {
  Applied: 'bg-slate-100 text-slate-700',
  Viewed: 'bg-blue-100 text-blue-700',
  Shortlisted: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
};

export default function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      {status}
    </span>
  );
}
