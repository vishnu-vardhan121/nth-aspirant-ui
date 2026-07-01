import { Link } from 'react-router-dom';
import { HiChatBubbleLeftRight } from 'react-icons/hi2';
import { Loader } from '../../../components/ui/Loader';
import { getMockRoleFitLabel } from '../../../lib/mockFeedbackTopics';
import { AspirantIdentity } from '../users/AspirantIdentity';

const thClass = 'px-4 py-3 text-left text-xs font-medium text-slate-500 whitespace-nowrap';
const tdClass = 'px-4 py-3 align-middle text-sm text-slate-700';

function PlanBadge({ plan }) {
  if (!plan) return <span className="text-slate-400">—</span>;
  return (
    <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase text-slate-700">
      {plan}
    </span>
  );
}

function PipelineBadge({ row }) {
  const placed = (row.profile_status ?? 'active') === 'inactive';
  const ready = (row.placement_pipeline_status ?? 'none') === 'ready';

  if (placed) {
    return <span className="text-xs font-medium text-amber-800">Placed</span>;
  }
  if (ready) {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
        Ready for interviews
      </span>
    );
  }
  return <span className="text-xs text-slate-500">In training pool</span>;
}

function MockScores({ row }) {
  if (row.latest_mock_overall == null) {
    return <span className="text-xs text-slate-400">No mocks</span>;
  }
  return (
    <p className="font-mono text-xs text-slate-700">
      O{row.latest_mock_overall} · C{row.latest_mock_communication ?? '—'}
      {row.latest_mock_technical != null ? ` · T${row.latest_mock_technical}` : ''}
    </p>
  );
}

function RoleFitCell({ row }) {
  const keys = Array.isArray(row.all_mock_role_fit_keys) && row.all_mock_role_fit_keys.length
    ? row.all_mock_role_fit_keys
    : Array.isArray(row.latest_mock_role_fit_keys)
      ? row.latest_mock_role_fit_keys
      : [];
  if (!keys.length) return <span className="text-xs text-slate-400">—</span>;
  const visible = keys.slice(0, 3);
  const title = keys.map(getMockRoleFitLabel).join(', ');
  return (
    <span className="text-xs text-violet-800" title={title}>
      {visible.map(getMockRoleFitLabel).join(', ')}
      {keys.length > 3 ? ` +${keys.length - 3}` : ''}
    </span>
  );
}

export default function JobApplicantsTable({
  applications,
  updatingId,
  onSetStatus,
  onViewProfile,
  formatDate,
  emptyMessage = 'No applicants match your filters.',
}) {
  if (!applications.length) {
    return (
      <p className="px-4 py-10 text-center text-sm text-slate-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className={thClass}>Student</th>
            <th className={thClass}>Plan</th>
            <th className={thClass}>Placement readiness</th>
            <th className={thClass}>Latest mocks</th>
            <th className={thClass}>Recommended for</th>
            <th className={thClass}>Applied</th>
            <th className={thClass}>Status</th>
            <th className={thClass}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((a) => (
            <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50/80">
              <td className={tdClass}>
                <AspirantIdentity name={a.aspirant_name} phone={a.aspirant_phone} email={a.aspirant_email} />
              </td>
              <td className={tdClass}>
                <PlanBadge plan={a.plan} />
              </td>
              <td className={tdClass}>
                <PipelineBadge row={a} />
              </td>
              <td className={tdClass}>
                <MockScores row={a} />
                {a.mocks_completed_total > 0 ? (
                  <p className="mt-0.5 text-[10px] text-slate-400">{a.mocks_completed_total} completed</p>
                ) : null}
              </td>
              <td className={tdClass}>
                <RoleFitCell row={a} />
              </td>
              <td className={`${tdClass} text-slate-600 whitespace-nowrap`}>{formatDate(a.created_at)}</td>
              <td className={tdClass}>
                <span
                  className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    a.status === 'shortlisted'
                      ? 'bg-emerald-100 text-emerald-700'
                      : a.status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {a.status}
                </span>
              </td>
              <td className={tdClass}>
                <div className="flex flex-wrap items-center gap-2">
                  {a.status === 'shortlisted' && (
                    <Link
                      to="/admin/messages"
                      state={{ openAspirantId: a.aspirant_id, openAspirantName: a.aspirant_name }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100"
                    >
                      <HiChatBubbleLeftRight className="w-3.5 h-3.5" />
                      Message
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => onViewProfile(a.aspirant_id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50"
                  >
                    Full profile
                  </button>
                  {updatingId === a.id ? (
                    <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                      <Loader size="xs" /> Updating…
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onSetStatus(a.id, 'shortlisted')}
                        disabled={a.status === 'shortlisted'}
                        className="text-emerald-600 hover:underline font-medium disabled:opacity-50 text-xs"
                      >
                        Shortlist
                      </button>
                      <button
                        type="button"
                        onClick={() => onSetStatus(a.id, 'rejected')}
                        disabled={a.status === 'rejected'}
                        className="text-red-600 hover:underline font-medium disabled:opacity-50 text-xs"
                      >
                        Reject
                      </button>
                      {a.status !== 'applied' && (
                        <button
                          type="button"
                          onClick={() => onSetStatus(a.id, 'applied')}
                          className="text-slate-600 hover:underline font-medium text-xs"
                        >
                          Reset
                        </button>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
