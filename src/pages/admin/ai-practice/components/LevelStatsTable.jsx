const LEVEL_LABELS = {
  1: 'Basic',
  2: 'Medium',
  3: 'Hard',
};

export default function LevelStatsTable({ levels }) {
  const rows = Array.isArray(levels) ? levels : [];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">By level</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No sessions yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3 font-medium">Level</th>
                <th className="py-2 pr-3 font-medium">Sessions</th>
                <th className="py-2 pr-3 font-medium">Passed</th>
                <th className="py-2 font-medium">Pass rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.level} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-3 font-medium text-slate-900">
                    L{row.level} — {LEVEL_LABELS[row.level] || '—'}
                  </td>
                  <td className="py-2 pr-3 text-slate-700">{row.sessions ?? 0}</td>
                  <td className="py-2 pr-3 text-slate-700">{row.passed ?? 0}</td>
                  <td className="py-2 text-slate-700">
                    {row.pass_rate == null ? '—' : `${row.pass_rate}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
