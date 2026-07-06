import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { HiArrowLeft, HiLifebuoy, HiPlus } from 'react-icons/hi2';
import Navbar from '../../components/Navbar';
import { PageLoader } from '../../components/ui/Loader';
import HelpDeskModal from '../landing/home/components/HelpDeskModal';
import HelpDeskConversation from '../../components/helpDesk/HelpDeskConversation';
import {
  fetchMyHelpDeskAccess,
  fetchMyHelpRequests,
  formatHelpDeskTime,
  helpIssueTypeLabel,
  helpStatusBadgeClass,
} from '../../lib/helpDesk';
import { useAppSelector } from '../../store/hooks';

export default function SupportPage() {
  const user = useAppSelector((state) => state.auth.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(searchParams.get('ticket') || '');
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

  useEffect(() => {
    loadTickets().then((list) => {
      const fromUrl = searchParams.get('ticket');
      if (fromUrl && list.some((t) => t.id === fromUrl)) {
        setSelectedId(fromUrl);
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
    setSearchParams(id ? { ticket: id } : {}, { replace: true });
  };

  const handleNewTicket = async (data) => {
    setHelpOpen(false);
    await loadTickets();
    if (data?.id) selectTicket(data.id);
  };

  const dashboardBack = user ? '/dashboard' : '/';

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to={dashboardBack} className="mb-2 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
              <HiArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <HiLifebuoy className="h-7 w-7 text-indigo-600" />
              Support
              {access.unreadTotal > 0 ? (
                <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  {access.unreadTotal} unread
                </span>
              ) : null}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Tickets linked to your login or the same email address.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <HiPlus className="h-4 w-4" />
            New ticket
          </button>
        </div>

        {access.blocked ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Your messages go to a restricted support queue. You can still send tickets and replies here.
            {access.reason ? ` Note: ${access.reason}` : null}
          </div>
        ) : null}

        {loading ? (
          <PageLoader size="md" label="Loading your tickets…" className="py-16" />
        ) : (
          <div className="grid min-h-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid-cols-[minmax(300px,360px)_1fr]">
            <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">Your tickets</p>
                <p className="text-xs text-slate-500">{tickets.length} conversation(s)</p>
              </div>
              <div className="max-h-[520px] overflow-y-auto lg:max-h-none">
                {!tickets.length ? (
                  <div className="px-4 py-10 text-center text-sm text-slate-500">
                    No tickets yet. Start one with New ticket.
                  </div>
                ) : (
                  tickets.map((ticket) => {
                    const unread = Number(ticket.unread_count || 0) > 0;
                    return (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => selectTicket(ticket.id)}
                      className={`w-full border-b border-slate-100 px-4 py-3 text-left transition-colors ${
                        selectedId === ticket.id ? 'bg-indigo-50/80' : unread ? 'bg-sky-50/50 hover:bg-sky-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-slate-900 ${unread ? 'font-bold' : 'font-medium'}`}>{helpIssueTypeLabel(ticket.issue_type)}</p>
                        <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-medium capitalize ${helpStatusBadgeClass(ticket.status)}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className={`mt-1 line-clamp-2 text-sm ${unread ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
                        {ticket.last_preview || ticket.message}
                      </p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-400">{formatHelpDeskTime(ticket.last_message_at || ticket.created_at)}</span>
                        {unread ? (
                          <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                            Unread
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Read</span>
                        )}
                      </div>
                    </button>
                    );
                  })
                )}
              </div>
            </aside>

            <section className="flex min-h-[420px] flex-col">
              {selectedTicket ? (
                <>
                  <div className="border-b border-slate-200 px-4 py-3">
                    <p className="font-semibold text-slate-900">{helpIssueTypeLabel(selectedTicket.issue_type)}</p>
                    <p className="text-xs text-slate-500">
                      #{selectedTicket.id.slice(0, 8)} · opened {formatHelpDeskTime(selectedTicket.created_at)}
                    </p>
                  </div>
                  <div className="min-h-0 flex-1">
                    <HelpDeskConversation
                      key={selectedTicket.id}
                      requestId={selectedTicket.id}
                      viewerRole="user"
                      onThreadLoaded={() => loadTickets()}
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
                  Select a ticket or create a new one.
                </div>
              )}
            </section>
          </div>
        )}
      </div>

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
