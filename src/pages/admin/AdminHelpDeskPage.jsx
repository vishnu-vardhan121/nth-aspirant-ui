import { useEffect, useMemo, useState } from 'react';
import HelpDeskConversation from '../../components/helpDesk/HelpDeskConversation';import { PageLoader } from '../../components/ui/Loader';
import HelpDeskBlockedPanel from './helpDesk/HelpDeskBlockedPanel';
import {
  blockHelpDeskUser,
  fetchAdminHelpDeskSummary,
  fetchAdminHelpRequests,
  formatHelpDeskTime,  helpIssueTypeLabel,
  helpStatusBadgeClass,
  unblockHelpDeskUser,
  updateHelpRequestStatus,
} from '../../lib/helpDesk';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Closed (resolved)' },
];

const INBOX_TABS = [
  { id: 'main', label: 'Main inbox' },
  { id: 'blocked', label: 'Blocked inbox' },
];

export default function AdminHelpDeskPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inbox, setInbox] = useState('main');
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [savingId, setSavingId] = useState('');
  const [flash, setFlash] = useState({ type: '', text: '' });
  const [selectedId, setSelectedId] = useState('');
  const [inboxSummary, setInboxSummary] = useState({    main_unread: 0,
    blocked_unread: 0,
    main_open: 0,
    blocked_open: 0,
  });

  const loadSummary = async () => {
    const { data } = await fetchAdminHelpDeskSummary();
    if (data?.ok) {
      setInboxSummary({
        main_unread: Number(data.main_unread || 0),
        blocked_unread: Number(data.blocked_unread || 0),
        main_open: Number(data.main_open || 0),
        blocked_open: Number(data.blocked_open || 0),
      });
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    const { data } = await fetchAdminHelpRequests(statusFilter, query, inbox);
    const list = Array.isArray(data) ? data : [];
    setRequests(list);
    setSelectedId((prev) => (list.some((r) => r.id === prev) ? prev : list[0]?.id || ''));
    await loadSummary();
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, inbox]);

  const hasRows = useMemo(() => requests.length > 0, [requests.length]);
  const summary = useMemo(() => {
    const open = requests.filter((r) => r.status === 'open').length;
    const inProgress = requests.filter((r) => r.status === 'in_progress').length;
    const resolved = requests.filter((r) => r.status === 'resolved').length;
    const unread = requests.reduce((sum, r) => sum + Number(r.unread_count || 0), 0);
    return { total: requests.length, open, inProgress, resolved, unread };
  }, [requests]);
  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === selectedId) ?? null,
    [requests, selectedId],
  );

  const updateStatus = async (row, nextStatus) => {
    setFlash({ type: '', text: '' });
    setSavingId(row.id);
    const { data, error } = await updateHelpRequestStatus(row.id, nextStatus, row.admin_notes || null);
    setSavingId('');
    if (error || !data?.ok) {
      setFlash({ type: 'error', text: data?.error || error?.message || 'Failed to update status.' });
      return;
    }
    setFlash({ type: 'success', text: 'Status updated.' });
    setRequests((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: nextStatus } : r)));
    await loadSummary();
  };

  const toggleBlockRequester = async (row) => {
    setFlash({ type: '', text: '' });
    setSavingId(row.id);
    if (row.requester_blocked) {
      const { data, error } = await unblockHelpDeskUser(row.email);
      setSavingId('');
      if (error || !data?.ok) {
        setFlash({ type: 'error', text: data?.error || error?.message || 'Failed to unblock.' });
        return;
      }
      setFlash({ type: 'success', text: 'Moved to main inbox.' });
    } else {
      const { data, error } = await blockHelpDeskUser({
        email: row.email,
        userId: row.user_id,
        phone: row.phone,
        reason: 'Blocked from ticket',
      });
      setSavingId('');
      if (error || !data?.ok) {
        setFlash({ type: 'error', text: data?.error || error?.message || 'Failed to block.' });
        return;
      }
      setFlash({ type: 'success', text: 'Moved to blocked inbox.' });
    }
    await loadRequests();
  };

  if (loading && !requests.length) {
    return <PageLoader size="md" label="Loading help requests..." className="py-12" />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h1 className="text-2xl font-bold text-slate-900">Help desk</h1>
        <p className="mt-1 text-sm text-slate-600">
          Main inbox for normal tickets. Blocked users can still message — their tickets land in the blocked inbox.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {INBOX_TABS.map((tab) => {
          const unread = tab.id === 'blocked' ? inboxSummary.blocked_unread : inboxSummary.main_unread;
          const active = inbox === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setInbox(tab.id)}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? tab.id === 'blocked'
                    ? 'border-red-300 bg-red-50 text-red-800'
                    : 'border-indigo-300 bg-indigo-50 text-indigo-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              {unread > 0 ? (
                <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  {unread} unread
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {inbox === 'blocked' ? (
        <HelpDeskBlockedPanel
          flash={flash}
          setFlash={setFlash}
          onChanged={loadRequests}
        />
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">In view</p>
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
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Closed</p>
          <p className="mt-1 text-xl font-semibold text-emerald-900">{summary.resolved}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 col-span-2 sm:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">Unread here</p>
          <p className="mt-1 text-xl font-semibold text-indigo-900">{summary.unread}</p>
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
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:max-w-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:w-48"
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
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 sm:w-auto"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setStatusFilter('all');
              }}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
            >
              Reset
            </button>
          </div>
        </div>
        {flash.text ? (
          <p className={`mt-3 text-sm ${flash.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{flash.text}</p>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white lg:grid lg:grid-cols-[minmax(340px,400px)_1fr]">
        <aside className="min-h-[320px] border-b border-slate-200 lg:min-h-[600px] lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">
              {inbox === 'blocked' ? 'Blocked inbox' : 'Main inbox'}
            </p>
            <p className="text-xs text-slate-500">{requests.length} ticket(s)</p>
          </div>
          <div className="max-h-[640px] overflow-y-auto">
            {!hasRows ? (
              <div className="px-4 py-12 text-center text-slate-500">
                {inbox === 'blocked' ? 'No tickets from blocked users.' : 'No help requests found.'}
              </div>
            ) : (
              requests.map((row) => {
                const unread = Number(row.unread_count || 0) > 0;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={`w-full border-b border-slate-100 px-4 py-3 text-left transition-colors ${
                      selectedId === row.id ? 'bg-indigo-50/70' : unread ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-slate-900 ${unread ? 'font-bold' : 'font-medium'}`}>{row.name}</p>
                      <span className={`inline-flex shrink-0 rounded px-2 py-0.5 text-xs font-medium capitalize ${helpStatusBadgeClass(row.status)}`}>
                        {row.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      #{row.id.slice(0, 8)} · {formatHelpDeskTime(row.last_message_at || row.created_at)}
                    </p>
                    <p className={`mt-1 line-clamp-2 text-sm ${unread ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
                      {row.last_preview || row.message}
                    </p>
                    {unread ? (
                      <span className="mt-2 inline-flex rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Unread
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex min-h-[480px] flex-col lg:min-h-[600px]">
          {!selectedRequest ? (
            <div className="flex flex-1 items-center justify-center text-slate-500">Select a ticket to view the conversation.</div>
          ) : (
            <>
              <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{selectedRequest.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {helpIssueTypeLabel(selectedRequest.issue_type)} · opened {formatHelpDeskTime(selectedRequest.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedRequest.status}
                      disabled={savingId === selectedRequest.id}
                      onChange={(e) => updateStatus(selectedRequest, e.target.value)}
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      {STATUS_OPTIONS.map((statusOption) => (
                        <option key={statusOption.value} value={statusOption.value}>
                          {statusOption.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={savingId === selectedRequest.id}
                      onClick={() => toggleBlockRequester(selectedRequest)}
                      className={`rounded-md px-3 py-2 text-sm font-medium ${
                        selectedRequest.requester_blocked
                          ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                          : 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      {selectedRequest.requester_blocked ? 'Move to main inbox' : 'Move to blocked inbox'}
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-700">
                  <a href={`tel:${selectedRequest.phone}`} className="font-medium text-indigo-700 hover:underline">
                    {selectedRequest.phone}
                  </a>
                  <a href={`mailto:${selectedRequest.email}`} className="break-all font-medium text-indigo-700 hover:underline">
                    {selectedRequest.email}
                  </a>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <HelpDeskConversation
                  key={selectedRequest.id}
                  requestId={selectedRequest.id}
                  viewerRole="admin"
                  onThreadLoaded={() => loadRequests()}
                />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
