export default function TrackStatsTable({ tracks }) {
  const rows = Array.isArray(tracks) ? tracks : [];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">By track</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No sessions yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3 font-medium">Track</th>
                <th className="py-2 pr-3 font-medium">Sessions</th>
                <th className="py-2 pr-3 font-medium">Completed</th>
                <th className="py-2 font-medium">Passed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.track} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-3 font-medium capitalize text-slate-900">{row.track}</td>
                  <td className="py-2 pr-3 text-slate-700">{row.sessions ?? 0}</td>
                  <td className="py-2 pr-3 text-slate-700">{row.completed ?? 0}</td>
                  <td className="py-2 text-slate-700">{row.passed ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
