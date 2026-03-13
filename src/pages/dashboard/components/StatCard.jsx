export default function StatCard({ label, value, note = '', icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          {note ? (
            <p className="mt-1 text-xs text-slate-500 leading-5">{note}</p>
          ) : null}
        </div>
        {Icon ? (
          <span className="h-9 w-9 shrink-0 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
    </div>
  );
}
