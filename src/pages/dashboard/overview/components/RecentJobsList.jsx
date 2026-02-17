import { Link } from 'react-router-dom';

export default function RecentJobsList({ jobs }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <ul className="divide-y divide-slate-100">
        {jobs.length === 0 ? (
          <li className="px-5 py-6 text-center text-slate-500 text-sm">No recent jobs</li>
        ) : (
        jobs.map((job) => (
          <li key={job.id}>
            <Link
              to="/dashboard/jobs"
              className="block px-5 py-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mb-1">
                <span>{job.company}</span>
                <span>·</span>
                <span>{job.location}</span>
                <span>·</span>
                <span>{job.type}</span>
              </div>
              <p className="font-medium text-slate-900">{job.title}</p>
              <p className="text-sm text-slate-600 mt-0.5 line-clamp-1">{job.snippet}</p>
            </Link>
          </li>
        ))
        )}
      </ul>
    </div>
  );
}
