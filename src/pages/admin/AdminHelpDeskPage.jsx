import { Fragment, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { PageLoader } from '../../components/ui/Loader';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
];

const ISSUE_TYPE_LABELS = {
  general: 'General question',
  account: 'Dashboard / login / account',
  technical: 'Website or technical issue',
  jobs: 'Jobs or applications',
  mocks: 'Mock interviews or scheduling',
  payment: 'Billing or payment',
  ads: 'Advertising or sponsorship',
  other: 'Something else',
};

function issueTypeLabel(value) {
  if (!value) return '—';
  return ISSUE_TYPE_LABELS[value] ?? value;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusBadgeClass(status) {
  if (status === 'resolved') return 'bg-emerald-100 text-emerald-700';
  if (status === 'in_progress') return 'bg-amber-100 text-amber-700';
  return 'bg-sky-100 text-sky-700';
}

export default function AdminHelpDeskPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [savingId, setSavingId] = useState('');
  const [flash, setFlash] = useState({ type: '', text: '' });
  const [expandedId, setExpandedId] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const loadRequests = async () => {
    setLoading(true);
    const { data } = await supabase.rpc('get_admin_help_requests', {
      p_status: statusFilter === 'all' ? null : statusFilter,
      p_search: query.trim() || null,
    });
    const list = Array.isArray(data) ? data : [];
    setRequests(list);
    setSelectedId((prev) => (list.some((r) => r.id === prev) ? prev : list[0]?.id || ''));
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const hasRows = useMemo(() => requests.length > 0, [requests.length]);
  const summary = useMemo(() => {
    const open = requests.filter((r) => r.status === 'open').length;
    const inProgress = requests.filter((r) => r.status === 'in_progress').length;
    const resolved = requests.filter((r) => r.status === 'resolved').length;
    return {
      total: requests.length,
      open,
      inProgress,
      resolved,
    };
  }, [requests]);
  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === selectedId) ?? null,
    [requests, selectedId]
  );

  const updateStatus = async (row, nextStatus) => {
    setFlash({ type: '', text: '' });
    setSavingId(row.id);
    const { data, error } = await supabase.rpc('update_help_request_status', {
      p_request_id: row.id,
      p_status: nextStatus,
      p_admin_notes: row.admin_notes || null,
    });
    setSavingId('');
    if (error || !data?.ok) {
      setFlash({ type: 'error', text: data?.error || error?.message || 'Failed to update status.' });
      return;
    }
    setFlash({ type: 'success', text: 'Status updated.' });
    setRequests((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: nextStatus } : r)));
  };

  const updateAdminNotes = async (row, notes) => {
    setRequests((prev) => prev.map((r) => (r.id === row.id ? { ...r, admin_notes: notes } : r)));
  };

  const saveNotes = async (row) => {
    setFlash({ type: '', text: '' });
    setSavingId(row.id);
    const { data, error } = await supabase.rpc('update_help_request_status', {
      p_request_id: row.id,
      p_status: row.status,
      p_admin_notes: row.admin_notes || null,
    });
    setSavingId('');
    if (error || !data?.ok) {
      setFlash({ type: 'error', text: data?.error || error?.message || 'Failed to save notes.' });
      return;
    }
    setFlash({ type: 'success', text: 'Notes saved.' });
  };

  const toggleExpanded = (rowId) => {
    setExpandedId((prev) => (prev === rowId ? '' : rowId));
  };

  if (loading) return <PageLoader size="md" label="Loading help requests..." className="py-12" />;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h1 className="text-2xl font-bold text-slate-900">Help desk</h1>
        <p className="mt-1 text-sm text-slate-600">Landing page support requests submitted from the Help button.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-600">Open</p>
          <p className="mt-1 text-xl font-semibold text-sky-900">{summary.open}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-600">In progress</p>
          <p className="mt-1 text-xl font-semibold text-amber-900">{summary.inProgress}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Resolved</p>
          <p className="mt-1 text-xl font-semibold text-emerald-900">{summary.resolved}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') loadRequests();
            }}
            placeholder="Search name, email, phone, issue..."
            className="w-full sm:max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadRequests}
              className="w-full sm:w-auto rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setStatusFilter('all');
              }}
              className="w-full sm:w-auto rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>
        {flash.text && (
          <p className={`mt-3 text-sm ${flash.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{flash.text}</p>
        )}
      </div>

      <div className="space-y-3 lg:hidden">
        {!hasRows ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500">
            No help requests found.
          </div>
        ) : (
          requests.map((row) => (
            <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{row.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{formatDate(row.created_at)}</p>
                </div>
                <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(row.status)}`}>
                  {row.status.replace('_', ' ')}
                </span>
              </div>

              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p><span className="font-medium text-slate-900">Phone:</span> {row.phone}</p>
                <p className="break-all"><span className="font-medium text-slate-900">Email:</span> {row.email}</p>
                <p><span className="font-medium text-slate-900">Type:</span> {issueTypeLabel(row.issue_type)}</p>
                <p className="whitespace-pre-wrap"><span className="font-medium text-slate-900">Issue:</span> {row.message}</p>
              </div>

              <div className="mt-3 grid gap-2">
                <select
                  value={row.status}
                  disabled={savingId === row.id}
                  onChange={(e) => updateStatus(row, e.target.value)}
                  className="rounded-md border border-slate-300 px-2 py-2 text-sm bg-white"
                >
                  {STATUS_OPTIONS.map((statusOption) => (
                    <option key={statusOption.value} value={statusOption.value}>
                      {statusOption.label}
                    </option>
                  ))}
                </select>
                <textarea
                  rows={2}
                  value={row.admin_notes || ''}
                  onChange={(e) => updateAdminNotes(row, e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                  placeholder="Optional notes..."
                />
                <button
                  type="button"
                  disabled={savingId === row.id}
                  onClick={() => saveNotes(row)}
                  className="rounded-md bg-slate-100 px-2.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                >
                  {savingId === row.id ? 'Saving...' : 'Save notes'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden rounded-xl border border-slate-200 bg-white lg:grid lg:grid-cols-[minmax(340px,420px)_1fr]">
        <aside className="min-h-[540px] border-r border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">Tickets</p>
            <p className="text-xs text-slate-500">{requests.length} request(s)</p>
          </div>
          <div className="max-h-[640px] overflow-y-auto">
            {!hasRows ? (
              <div className="px-4 py-12 text-center text-slate-500">No help requests found.</div>
            ) : (
              requests.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className={`w-full border-b border-slate-100 px-4 py-3 text-left transition-colors ${
                    selectedId === row.id ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-slate-900">{row.name}</p>
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(row.status)}`}>
                      {row.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">#{row.id.slice(0, 8)} · {formatDate(row.created_at)}</p>
                  <p className="mt-1 text-sm text-slate-600 line-clamp-2 whitespace-pre-wrap">{row.message}</p>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="min-h-[540px] p-5">
          {!selectedRequest ? (
            <div className="flex h-full items-center justify-center text-slate-500">Select a ticket to view details.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{selectedRequest.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">Ticket #{selectedRequest.id.slice(0, 8)} · {formatDate(selectedRequest.created_at)}</p>
                </div>
                <span className={`inline-flex rounded px-2.5 py-1 text-xs font-medium capitalize ${statusBadgeClass(selectedRequest.status)}`}>
                  {selectedRequest.status.replace('_', ' ')}
                </span>
              </div>

              <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3 sm:grid-cols-2">
                <p className="text-sm text-slate-700"><span className="font-medium text-slate-900">Phone:</span> {selectedRequest.phone}</p>
                <p className="text-sm text-slate-700 break-all"><span className="font-medium text-slate-900">Email:</span> {selectedRequest.email}</p>
                <p className="text-sm text-slate-700 sm:col-span-2"><span className="font-medium text-slate-900">Type:</span> {issueTypeLabel(selectedRequest.issue_type)}</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Issue details</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{selectedRequest.message}</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
                    <select
                      value={selectedRequest.status}
                      disabled={savingId === selectedRequest.id}
                      onChange={(e) => updateStatus(selectedRequest, e.target.value)}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
                    >
                      {STATUS_OPTIONS.map((statusOption) => (
                        <option key={statusOption.value} value={statusOption.value}>
                          {statusOption.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <a
                    href={`tel:${selectedRequest.phone}`}
                    className="rounded-md bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                  >
                    Call requester
                  </a>
                  <a
                    href={`mailto:${selectedRequest.email}`}
                    className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                  >
                    Email requester
                  </a>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin notes</p>
                <textarea
                  rows={5}
                  value={selectedRequest.admin_notes || ''}
                  onChange={(e) => updateAdminNotes(selectedRequest, e.target.value)}
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Add notes for follow-up..."
                />
                <button
                  type="button"
                  disabled={savingId === selectedRequest.id}
                  onClick={() => saveNotes(selectedRequest)}
                  className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                >
                  {savingId === selectedRequest.id ? 'Saving...' : 'Save notes'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
