import { TableSkeleton } from '../../../components/ui/Loader';
import {
  jobDomainLabel,
  jobDomainsLabel,
  qualificationLabel,
  branchLabel,
  communicationLabel,
  noticePeriodLabel,
} from '../../../lib/aspirantFilterOptions';
import { PAGE_SIZE } from './constants';

export default function AdminUsersTable({
  users,
  loading,
  page,
  onPageChange,
  onViewProfile,
  onEditPlan,
  onExtraLimits,
}) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Domain / Role</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Qual / Branch</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Batch</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Score</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Notice</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Comm.</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Mocks</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Plan</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Track</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12} className="px-4 py-6">
                  <TableSkeleton rows={6} cols={12} className="px-4" />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-slate-500">No users match the filters.</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="text-slate-900 font-medium">{u.full_name ?? '—'}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[180px]">{u.email ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <p className="text-xs font-medium text-indigo-700">
                      {jobDomainsLabel(u.job_domains) !== '—'
                        ? jobDomainsLabel(u.job_domains)
                        : jobDomainLabel(u.job_domain)}
                    </p>
                    <p className="text-sm">{u.role_title ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    <p>{qualificationLabel(u.highest_qualification)}</p>
                    <p>{branchLabel(u.highest_qualification, u.degree_branch, u.degree_branch_other)}</p>
                    {u.college_name ? (
                      <p className="text-slate-400 truncate max-w-[120px]" title={u.college_name}>{u.college_name}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.graduation_year ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {u.graduation_score != null
                      ? `${u.graduation_score}${u.graduation_score_type === 'percentage' ? '%' : ''}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    <p>{noticePeriodLabel(u.notice_period)}</p>
                    {u.available_from && u.notice_period !== 'immediate' ? (
                      <p className="text-slate-400">LWD {u.available_from}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{communicationLabel(u.communication_level)}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    <p>{u.mocks_conducted_in_period ?? 0}/{u.mock_limit ?? 0} period</p>
                    {u.latest_mock_overall != null ? (
                      <p className="text-indigo-700 font-medium">
                        O:{u.latest_mock_overall} C:{u.latest_mock_communication ?? '—'}
                      </p>
                    ) : (
                      <p className="text-slate-400">No mock done</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{u.plan ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{u.track ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {u.is_active ? 'Active' : 'Expired'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => onViewProfile(u.id)} className="text-indigo-600 hover:underline text-xs font-medium">
                      View profile
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditPlan({ id: u.id, full_name: u.full_name, email: u.email, plan: u.plan || 'base' })}
                      className="text-slate-600 hover:underline text-xs font-medium"
                    >
                      Edit plan
                    </button>
                    <button
                      type="button"
                      onClick={() => onExtraLimits({
                        id: u.id,
                        full_name: u.full_name,
                        email: u.email,
                        extra_mock_limit: u.extra_mock_limit ?? 0,
                        extra_interview_limit: u.extra_interview_limit ?? 0,
                      })}
                      className="text-slate-600 hover:underline text-xs font-medium"
                    >
                      Extra limits
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="p-3 border-t border-slate-200 flex items-center justify-between">
        <span className="text-xs text-slate-500">Page {page + 1}</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={users.length < PAGE_SIZE}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
