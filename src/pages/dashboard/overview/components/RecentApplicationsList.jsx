import { Link } from 'react-router-dom';
import StatusBadge from '../../components/StatusBadge';

export default function RecentApplicationsList({ applications }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/40 overflow-hidden">
      <ul className="divide-y divide-slate-100">
        {applications.length === 0 ? (
          <li className="px-5 py-6 text-center text-slate-500 text-sm">No applications yet</li>
        ) : (
          applications.map((app) => (
            <li key={app.id}>
              <Link
                to="/dashboard/applications"
                className="block px-4 sm:px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{app.jobTitle}</p>
                    <p className="text-sm text-slate-500 truncate">{app.company}</p>
                    <p className="text-xs text-slate-400 mt-1">Applied {app.appliedAt}</p>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
