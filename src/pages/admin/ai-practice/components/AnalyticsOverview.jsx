function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value ?? '—'}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value)}%`;
}

export default function AnalyticsOverview({ totals }) {
  const t = totals || {};

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Overview</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total sessions" value={t.sessions ?? 0} />
        <StatCard label="Completed" value={t.completed ?? 0} />
        <StatCard label="Passed" value={t.passed ?? 0} hint={`Pass rate ${formatPercent(t.pass_rate)}`} />
        <StatCard label="Active API keys" value={t.active_keys ?? 0} />
        <StatCard label="Today" value={t.today ?? 0} hint="Started today (IST)" />
        <StatCard label="Last 7 days" value={t.last_7_days ?? 0} />
      </div>
    </section>
  );
}
