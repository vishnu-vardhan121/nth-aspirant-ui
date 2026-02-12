import { Link } from 'react-router-dom';
import StatusBadge from '../../components/StatusBadge';

export default function RecentApplicationsList({ applications }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <ul className="divide-y divide-slate-100">
        {applications.map((app) => (
          <li key={app.id}>
            <Link
              to="/dashboard/applications"
              className="block px-5 py-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{app.jobTitle}</p>
                  <p className="text-sm text-slate-500">{app.company}</p>
                </div>
                <StatusBadge status={app.status} />
              </div>
              <p className="text-xs text-slate-400 mt-1">Applied {app.appliedAt}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
