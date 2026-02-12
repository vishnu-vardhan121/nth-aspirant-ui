export default function JobsTable({ jobs }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead>
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Posted
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-4">
                  <p className="font-medium text-slate-900">{job.title}</p>
                  <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">{job.snippet}</p>
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">{job.company}</td>
                <td className="px-5 py-4 text-sm text-slate-600">{job.location}</td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    {job.type}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-slate-500">{job.postedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
