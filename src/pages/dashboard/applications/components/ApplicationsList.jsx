import StatusBadge from '../../components/StatusBadge';

export default function ApplicationsList({ applications }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <ul className="divide-y divide-slate-200">
        {applications.length === 0 ? (
          <li className="px-5 py-8 text-center text-slate-500 text-sm">You haven’t applied to any jobs yet.</li>
        ) : (
        applications.map((app) => (
          <li
            key={app.id}
            className="px-5 py-4 hover:bg-slate-50 transition-colors flex flex-wrap items-center justify-between gap-4"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900">{app.jobTitle}</p>
              <p className="text-sm text-slate-500">{app.company}</p>
              <p className="text-xs text-slate-400 mt-1">Applied {app.appliedAt}</p>
            </div>
            <StatusBadge status={app.status} />
          </li>
        ))
        )}
      </ul>
    </div>
  );
}
