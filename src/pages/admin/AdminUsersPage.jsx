import { useState } from 'react';
import { HiPlus, HiArrowDownTray } from 'react-icons/hi2';
import CreateAspirantModal from './CreateAspirantModal';
import { useAdminUsersPage } from './users/useAdminUsersPage';
import AdminUsersSummary from './users/AdminUsersSummary';
import AdminUsersFilterBar from './users/AdminUsersFilterBar';
import AdminUsersTable from './users/AdminUsersTable';
import UserProfileModal from './users/UserProfileModal';
import AdminUserManageModal from './users/AdminUserManageModal';

/**
 * @typedef {{ kind: 'profile', aspirantId: string } | { kind: 'manage', user: object } | { kind: 'create' }} AdminUsersModal
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
    resetFilters,
    refresh,
    exportExcel,
    exportPlacementExcel,
    exporting,
  } = useAdminUsersPage();

  const [modal, setModal] = useState(null);
  const [exportMessage, setExportMessage] = useState('');

  const closeModal = () => setModal(null);

  const handleExport = async () => {
    setExportMessage('');
    const result = await exportExcel();
    if (result?.ok) {
      setExportMessage(`Downloaded ${result.count} profile(s).`);
    } else {
      setExportMessage('No profiles match your filters.');
    }
  };

  const handlePlacementExport = async () => {
    setExportMessage('');
    try {
      const result = await exportPlacementExcel();
      if (result?.ok) {
        setExportMessage(
          `Downloaded placement sheet (${result.count}). Resume links work for 30 days.`,
        );
      } else {
        setExportMessage('No profiles match your filters.');
      }
    } catch (err) {
      setExportMessage(err?.message || 'Placement export failed.');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Search and filter aspirants by education, mock scores, topic ratings, and internal role-fit tags.
            Export up to 100 matches as Excel (admin or placement sheet).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <HiArrowDownTray className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Download Excel'}
          </button>
          <button
            type="button"
            onClick={handlePlacementExport}
            disabled={exporting || loading}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 shadow-sm hover:bg-emerald-100 disabled:opacity-50"
          >
            <HiArrowDownTray className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Placement sheet'}
          </button>
          <button
            type="button"
            onClick={() => setModal({ kind: 'create' })}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <HiPlus className="h-4 w-4" />
            Create aspirant
          </button>
        </div>
      </div>

      {exportMessage ? (
        <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {exportMessage}
        </p>
      ) : null}

      <AdminUsersSummary summary={summary} />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <AdminUsersFilterBar
          filters={filters}
          onPatch={patchFilter}
          onQualificationChange={setQualification}
          onReset={resetFilters}
        />

        <AdminUsersTable
          users={users}
          loading={loading}
          page={filters.page}
          onPageChange={setPage}
          onViewProfile={(aspirantId) => setModal({ kind: 'profile', aspirantId })}
          onManage={(user) => setModal({ kind: 'manage', user })}
        />
      </section>

      {modal?.kind === 'manage' && (
        <AdminUserManageModal
          user={modal.user}
          onClose={closeModal}
          onSuccess={refresh}
          onViewProfile={(aspirantId) => setModal({ kind: 'profile', aspirantId })}
        />
      )}

      {modal?.kind === 'profile' && (
        <UserProfileModal aspirantId={modal.aspirantId} onClose={closeModal} onUpdated={refresh} />
      )}

      {modal?.kind === 'create' && (
        <CreateAspirantModal onClose={closeModal} onSuccess={refresh} />
      )}
    </div>
  );
}
