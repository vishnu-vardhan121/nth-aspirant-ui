function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
}

export default function ApiKeyTable({ keys, busyId, onToggle, onDelete }) {
  const rows = Array.isArray(keys) ? keys : [];

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-600">
        No API keys yet. Add at least one Gemini key to enable AI Practice.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="px-3 py-2 font-medium">Label</th>
            <th className="px-3 py-2 font-medium">Key</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Usage</th>
            <th className="px-3 py-2 font-medium">Errors</th>
            <th className="px-3 py-2 font-medium">Last used</th>
            <th className="px-3 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const busy = busyId === row.id;
            return (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-900">{row.label}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-600">{row.masked_key}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      row.is_active
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {row.is_active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-700">{row.usage_count ?? 0}</td>
                <td className="px-3 py-2 text-slate-700">{row.error_count ?? 0}</td>
                <td className="px-3 py-2 text-slate-600">{formatDate(row.last_used_at)}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onToggle(row.id, !row.is_active)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {row.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onDelete(row.id)}
                      className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
