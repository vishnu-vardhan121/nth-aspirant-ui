import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HiArrowLeft, HiPlus } from 'react-icons/hi2';
import { PageLoader } from '../../../components/ui/Loader';
import HelpDeskModal from '../../landing/home/components/HelpDeskModal';
import HelpDeskConversation from '../../../components/helpDesk/HelpDeskConversation';
import {
  fetchMyHelpDeskAccess,
  fetchMyHelpRequests,
  formatHelpDeskTime,
  helpIssueTypeLabel,
  helpStatusBadgeClass,
} from '../../../lib/helpDesk';
import { useAppSelector } from '../../../store/hooks';

/**
 * Aspirant support inbox — lives under DashboardLayout at /dashboard/support.
 */
export default function SupportPage() {
  const user = useAppSelector((state) => state.auth.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(searchParams.get('ticket') || '');
  const [mobileShowThread, setMobileShowThread] = useState(Boolean(searchParams.get('ticket')));
  const [access, setAccess] = useState({ blocked: false, reason: '', unreadTotal: 0 });

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const [ticketsRes, accessRes] = await Promise.all([fetchMyHelpRequests(), fetchMyHelpDeskAccess()]);
    setTickets(ticketsRes.data);
    if (accessRes.data?.ok) {
      setAccess({
        blocked: Boolean(accessRes.data.blocked),
        reason: accessRes.data.reason || '',
        unreadTotal: Number(accessRes.data.unread_total || 0),
      });
    }
    setLoading(false);
    return ticketsRes.data;
  }, []);

  const handleThreadOpened = useCallback((request) => {
    const id = request?.id;
    if (!id) return;
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, unread_count: 0 } : t)));
    void fetchMyHelpDeskAccess().then((accessRes) => {
      if (accessRes.data?.ok) {
        setAccess({
          blocked: Boolean(accessRes.data.blocked),
          reason: accessRes.data.reason || '',
          unreadTotal: Number(accessRes.data.unread_total || 0),
        });
      }
    });
  }, []);

  useEffect(() => {
    loadTickets().then((list) => {
      const fromUrl = searchParams.get('ticket');
      if (fromUrl && list.some((t) => t.id === fromUrl)) {
        setSelectedId(fromUrl);
        setMobileShowThread(true);
      } else if (!selectedId && list[0]?.id) {
        setSelectedId(list[0].id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? null,
    [tickets, selectedId],
  );

  const selectTicket = (id) => {
    setSelectedId(id);
    setMobileShowThread(Boolean(id));
    setSearchParams(id ? { ticket: id } : {}, { replace: true });
  };

  const handleNewTicket = async (data) => {
    setHelpOpen(false);
    await loadTickets();
    if (data?.id) selectTicket(data.id);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Help
            {access.unreadTotal > 0 ? (
              <span className="ml-2 align-middle rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                {access.unreadTotal} unread
              </span>
            ) : null}
          </h1>
          <p className="mt-1 text-[13px] text-slate-600 sm:text-sm">
            Message NTH support. Replies show up in this inbox.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 sm:w-auto"
        >
          <HiPlus className="h-4 w-4" />
          New ticket
        </button>
      </div>

      {access.blocked ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your messages go to a restricted support queue. You can still send tickets and replies here.
          {access.reason ? ` Note: ${access.reason}` : null}
        </div>
      ) : null}

      {loading ? (
        <PageLoader size="md" label="Loading your tickets…" className="py-16" />
      ) : !tickets.length ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-12 text-center shadow-sm sm:py-16">
          <p className="text-base font-bold text-slate-900">No support tickets yet</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
            Need help with payments, mocks, or your account? Start a ticket and our team will reply here.
          </p>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="mt-6 inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-700"
          >
            <HiPlus className="h-4 w-4" />
            Create a ticket
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid lg:min-h-[560px] lg:grid-cols-[minmax(280px,340px)_1fr]">
          <aside
            className={`border-slate-200 lg:border-r ${
              mobileShowThread ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">Your tickets</p>
              <p className="text-xs text-slate-500">{tickets.length} conversation(s)</p>
            </div>
            <div className="max-h-[min(70vh,520px)] overflow-y-auto lg:max-h-none">
              {tickets.map((ticket) => {
                const unread = Number(ticket.unread_count || 0) > 0;
                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => selectTicket(ticket.id)}
                    className={`w-full border-b border-slate-100 px-4 py-3.5 text-left transition-colors active:bg-slate-50 ${
                      selectedId === ticket.id
                        ? 'bg-indigo-50/80'
                        : unread
                          ? 'bg-sky-50/50 hover:bg-sky-50'
                          : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm text-slate-900 ${unread ? 'font-bold' : 'font-medium'}`}>
                        {helpIssueTypeLabel(ticket.issue_type)}
                      </p>
                      <span
                        className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-medium capitalize ${helpStatusBadgeClass(ticket.status)}`}
                      >
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p
                      className={`mt-1 line-clamp-2 text-[13px] ${
                        unread ? 'font-medium text-slate-800' : 'text-slate-600'
                      }`}
                    >
                      {ticket.last_preview || ticket.message}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400">
                        {formatHelpDeskTime(ticket.last_message_at || ticket.created_at)}
                      </span>
                      {unread ? (
                        <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Unread
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section
            className={`flex min-h-[420px] flex-col ${
              mobileShowThread ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {selectedTicket ? (
              <>
                <div className="flex items-start gap-2 border-b border-slate-200 px-3 py-3 sm:px-4">
                  <button
                    type="button"
                    onClick={() => setMobileShowThread(false)}
                    className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
                    aria-label="Back to tickets"
                  >
                    <HiArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {helpIssueTypeLabel(selectedTicket.issue_type)}
                    </p>
                    <p className="text-xs text-slate-500">
                      #{selectedTicket.id.slice(0, 8)} · opened{' '}
                      {formatHelpDeskTime(selectedTicket.created_at)}
                    </p>
                  </div>
                </div>
                <div className="min-h-0 flex-1">
                  <HelpDeskConversation
                    key={selectedTicket.id}
                    requestId={selectedTicket.id}
                    viewerRole="user"
                    onThreadLoaded={handleThreadOpened}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
                Select a ticket to view the conversation.
              </div>
            )}
          </section>
        </div>
      )}

      <HelpDeskModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        source="support_page"
        initialValues={{
          name: String(user?.user_metadata?.full_name ?? '').trim(),
          email: String(user?.email ?? '').trim(),
        }}
        onSuccess={handleNewTicket}
        successDisplay="none"
      />
    </div>
  );
}
