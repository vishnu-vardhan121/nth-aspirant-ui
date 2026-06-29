import { HiPencilSquare } from 'react-icons/hi2';
import { TableSkeleton } from '../../../components/ui/Loader';
import {
  jobDomainLabel,
  jobDomainsLabel,
  qualificationLabel,
  branchLabel,
} from '../../../lib/aspirantFilterOptions';
import { getMockRoleFitLabel } from '../../../lib/mockFeedbackTopics';
import { PAGE_SIZE } from './constants';
import { AspirantIdentity, aspirantContactLabel } from './AspirantIdentity';

const thClass = 'px-4 py-3 text-left text-xs font-medium text-slate-500';
const tdClass = 'px-4 py-3.5 align-middle text-sm text-slate-700';

function PlacementDisplay({ user }) {
  const placed = (user.profile_status ?? 'active') === 'inactive';
  if (!placed) {
    return <span className="text-xs text-slate-500">In pool</span>;
  }
  return (
    <div className="text-xs text-slate-600">
      <span className="font-medium text-slate-800">Placed</span>
      {user.placed_in ? (
        <p className="mt-0.5 max-w-[160px] truncate" title={user.placed_in}>
          {user.placed_in}
        </p>
      ) : null}
      {user.placed_at ? <p className="text-slate-400">{user.placed_at}</p> : null}
    </div>
  );
}

function MockCell({ user }) {
  return (
    <div className="min-w-[7rem]">
      <p className="text-xs text-slate-500">
        <span className="font-medium text-slate-700">{user.mocks_conducted_in_period ?? 0}</span>/{user.mock_limit ?? 0}{' '}
        mocks
      </p>
      {user.latest_mock_overall != null ? (
        <p className="mt-0.5 font-mono text-xs text-slate-600">
          O{user.latest_mock_overall} · C{user.latest_mock_communication ?? '—'}
          {user.latest_mock_technical != null ? ` · T${user.latest_mock_technical}` : ''}
        </p>
      ) : (
        <p className="mt-0.5 text-xs text-slate-400">—</p>
      )}
    </div>
  );
}

function RecommendedForCell({ user }) {
  const roleFit = Array.isArray(user.all_mock_role_fit_keys) ? user.all_mock_role_fit_keys : [];
  if (roleFit.length === 0) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  const visible = roleFit.slice(0, 5);
  const fullTitle = roleFit.map(getMockRoleFitLabel).join(', ');

  return (
    <div className="min-w-[9rem] max-w-[200px] text-xs leading-snug text-violet-800" title={fullTitle}>
      {visible.map(getMockRoleFitLabel).join(', ')}
      {roleFit.length > 5 ? <span className="text-violet-600"> +{roleFit.length - 5}</span> : null}
    </div>
  );
}

export default function AdminUsersTable({ users, loading, page, onPageChange, onViewProfile, onManage }) {
  const colCount = 6;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className={`${thClass} min-w-[220px]`}>Aspirant</th>
              <th className={`${thClass} min-w-[180px]`}>Education</th>
              <th className={thClass}>Mocks</th>
              <th className={`${thClass} min-w-[140px]`}>Recommended for</th>
              <th className={thClass}>Placement</th>
              <th className={`${thClass} w-12`} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-8">
                  <TableSkeleton rows={8} cols={colCount} className="px-2" />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-14 text-center text-sm text-slate-500">
                  No users match your filters.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onViewProfile(u.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onViewProfile(u.id);
                    }
                  }}
                  aria-label={`View profile for ${aspirantContactLabel(u)}`}
                  className="cursor-pointer hover:bg-slate-50/80 focus-visible:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo-500"
                >
                  <td className={tdClass}>
                    <AspirantIdentity name={u.full_name} phone={u.phone} email={u.email} />
                    {(u.role_title || jobDomainsLabel(u.job_domains) !== '—' || u.job_domain) && (
                      <p className="mt-1 text-xs text-slate-600">
                        {[u.role_title, jobDomainsLabel(u.job_domains) !== '—' ? jobDomainsLabel(u.job_domains) : jobDomainLabel(u.job_domain)]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                    <p className="mt-1 text-xs capitalize text-slate-400">
                      {u.plan ?? '—'} · {u.track ?? '—'}
                      {u.is_active === false ? ' · sub expired' : ''}
                    </p>
                  </td>
                  <td className={tdClass}>
                    <p className="text-sm text-slate-800">
                      {qualificationLabel(u.highest_qualification)}
                      {u.degree_branch
                        ? ` · ${branchLabel(u.highest_qualification, u.degree_branch, u.degree_branch_other)}`
                        : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {[
                        u.graduation_year ? `Batch ${u.graduation_year}` : null,
                        u.graduation_score != null
                          ? `${u.graduation_score}${u.graduation_score_type === 'percentage' ? '%' : ' CGPA'}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>
                    {u.college_name ? (
                      <p className="mt-0.5 max-w-[200px] truncate text-xs text-slate-400" title={u.college_name}>
                        {u.college_name}
                      </p>
                    ) : null}
                  </td>
                  <td className={tdClass}>
                    <MockCell user={u} />
                  </td>
                  <td className={tdClass}>
                    <RecommendedForCell user={u} />
                  </td>
                  <td className={tdClass}>
                    <PlacementDisplay user={u} />
                  </td>
                  <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onManage(u);
                      }}
                      title="Edit"
                      aria-label={`Edit ${u.full_name ?? 'aspirant'}`}
                      className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <HiPencilSquare className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
        <p className="text-xs text-slate-500">
          Page {page + 1}
          {!loading && users.length > 0 ? ` · ${users.length} shown` : ''}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page === 0}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={users.length < PAGE_SIZE}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
