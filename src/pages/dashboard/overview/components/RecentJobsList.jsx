import { Link } from 'react-router-dom';

export default function RecentJobsList({ jobs }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/40 overflow-hidden">
      <ul className="divide-y divide-slate-100">
        {jobs.length === 0 ? (
          <li className="px-5 py-6 text-center text-slate-500 text-sm">No recent jobs</li>
        ) : (
          jobs.map((job) => (
            <li key={job.id}>
              <Link
                to="/dashboard/jobs"
                className="block px-4 sm:px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{job.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-500">
                      <span>{job.company}</span>
                      <span>•</span>
                      <span>{job.location}</span>
                      <span>•</span>
                      <span>{job.type}</span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    Posted {job.postedAt}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                  {job.snippet || 'No description available'}
                </p>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
