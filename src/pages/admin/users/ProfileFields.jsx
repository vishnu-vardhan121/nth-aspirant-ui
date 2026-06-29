/** Consistent label / value rows for profile modals. */

export function ProfileDetailGrid({ children, className = '' }) {
  return (
    <dl className={`grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 text-sm ${className}`}>
      {children}
    </dl>
  );
}

export function ProfileField({ label, value, children, span = 1, empty = '—' }) {
  const content = children ?? (value != null && value !== '' ? value : empty);
  return (
    <div className={span === 2 ? 'sm:col-span-2' : ''}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium leading-snug text-slate-900">{content}</dd>
    </div>
  );
}

export function ProfileExternalLink({ href, children }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline break-all"
    >
      {children ?? href}
    </a>
  );
}

export function ProfileBadge({ children, tone = 'slate', className = '' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    indigo: 'bg-indigo-50 text-indigo-800',
    emerald: 'bg-emerald-50 text-emerald-800',
    amber: 'bg-amber-50 text-amber-800',
    violet: 'bg-violet-50 text-violet-800',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone] ?? tones.slate} ${className}`}>
      {children}
    </span>
  );
}
