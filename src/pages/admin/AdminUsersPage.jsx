import { useState } from 'react';
import { HiPlus, HiArrowDownTray } from 'react-icons/hi2';
import CreateAspirantModal from './CreateAspirantModal';
import { useAdminUsersPage } from './users/useAdminUsersPage';
import AdminUsersSummary from './users/AdminUsersSummary';
import AdminUsersFilterBar from './users/AdminUsersFilterBar';
import AdminUsersTable from './users/AdminUsersTable';
import UserProfileModal from './users/UserProfileModal';
import EditPlanModal from './users/EditPlanModal';
import EditExtraLimitsModal from './users/EditExtraLimitsModal';

/**
 * Modal state — one object instead of four separate useStates.
 * @typedef {{ kind: 'profile', aspirantId: string } | { kind: 'create' } | { kind: 'editPlan', user: object } | { kind: 'extraLimits', user: object }} AdminUsersModal
 */

export default function AdminUsersPage() {
  const {
    summary,
    users,
    loading,
    filters,
    patchFilter,
    setQualification,
    setPage,
    refresh,
    exportCsv,
    exporting,
  } = useAdminUsersPage();

  const [modal, setModal] = useState(null);
  const [exportMessage, setExportMessage] = useState('');

  const closeModal = () => setModal(null);

  const handleExport = async () => {
    setExportMessage('');
    const result = await exportCsv();
    if (result?.ok) {
      setExportMessage(`Downloaded ${result.count} profile(s).`);
    } else {
      setExportMessage('No profiles match your filters.');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Users</h1>
      <p className="text-slate-600 mb-6">
        Filter by domain, qualification, skills, etc. Open a profile for mock scores and resume, or download up to 100 matching profiles as CSV.
      </p>

      <AdminUsersSummary summary={summary} />

      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-sm font-semibold text-slate-700">User list</h2>
            <button
              type="button"
              onClick={() => setModal({ kind: 'create' })}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              <HiPlus className="w-4 h-4" />
              Create Aspirant
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              <HiArrowDownTray className="w-4 h-4" />
              {exporting ? 'Exporting…' : 'Download CSV'}
            </button>
            {exportMessage && (
              <span className="text-xs text-slate-500">{exportMessage}</span>
            )}
          </div>
        </div>

        <AdminUsersFilterBar
          filters={filters}
          onPatch={patchFilter}
          onQualificationChange={setQualification}
        />

        <AdminUsersTable
          users={users}
          loading={loading}
          page={filters.page}
          onPageChange={setPage}
          onViewProfile={(aspirantId) => setModal({ kind: 'profile', aspirantId })}
          onEditPlan={(user) => setModal({ kind: 'editPlan', user })}
          onExtraLimits={(user) => setModal({ kind: 'extraLimits', user })}
        />
      </section>

      {modal?.kind === 'profile' && (
        <UserProfileModal aspirantId={modal.aspirantId} onClose={closeModal} />
      )}

      {modal?.kind === 'create' && (
        <CreateAspirantModal onClose={closeModal} onSuccess={refresh} />
      )}

      {modal?.kind === 'editPlan' && (
        <EditPlanModal
          user={modal.user}
          onClose={closeModal}
          onSuccess={() => { closeModal(); refresh(); }}
        />
      )}

      {modal?.kind === 'extraLimits' && (
        <EditExtraLimitsModal
          user={modal.user}
          onClose={closeModal}
          onSuccess={() => { closeModal(); refresh(); }}
        />
      )}
    </div>
  );
}
