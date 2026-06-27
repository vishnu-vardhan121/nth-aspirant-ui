function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default function AdminUsersSummary({ summary }) {
  if (!summary) return null;

  const byPlan = summary.by_plan || {};
  const byTrack = summary.by_track || {};

  return (
    <>
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Users</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total users" value={summary.total_users ?? 0} />
          <StatCard label="Active users" value={summary.active_users ?? 0} />
          <StatCard label="Paid users" value={summary.paid_users ?? 0} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs text-slate-500">By plan:</span>
          <span className="inline-flex px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs">Base {byPlan.base ?? 0}</span>
          <span className="inline-flex px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs">Silver {byPlan.silver ?? 0}</span>
          <span className="inline-flex px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs">Gold {byPlan.gold ?? 0}</span>
          <span className="text-xs text-slate-500 ml-2">By track:</span>
          <span className="inline-flex px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs">Fresher {byTrack.fresher ?? 0}</span>
          <span className="inline-flex px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs">Experienced {byTrack.experienced ?? 0}</span>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Jobs (applications this month)</h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="All users" value={summary.applications_this_month ?? 0} />
          <StatCard label="Active users only" value={summary.applications_this_month_active ?? 0} />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Admin mock targets</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Pending (fresher)" value={summary.pending_mocks_fresher ?? 0} />
          <StatCard label="Pending (experienced)" value={summary.pending_mocks_experienced ?? 0} />
          <StatCard label="Pending (total)" value={summary.pending_mocks_total ?? 0} />
          <StatCard label="Completed (fresher)" value={summary.completed_mocks_fresher ?? 0} />
          <StatCard label="Completed (experienced)" value={summary.completed_mocks_experienced ?? 0} />
          <StatCard label="Completed (total)" value={summary.completed_mocks_total ?? 0} />
        </div>
      </section>
    </>
  );
}
