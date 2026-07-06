import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { subscribeToAdminMessages } from '../../lib/messageRealtime';
import { sendMessageToActivePremiumMembers } from '../../lib/adminPremiumBroadcast';
import { Loader, LoaderDots } from '../../components/ui/Loader';
import { HiUserGroup, HiMegaphone, HiChatBubbleLeftRight, HiSparkles } from 'react-icons/hi2';

const BROADCAST_ID = '__broadcast__';
const PREMIUM_BROADCAST_ID = '__premium__';
const SEND_TO_SHORTLISTED = 'shortlisted';
const SEND_TO_ALL_APPLICANTS = 'all_applicants';

function formatTime(createdAt) {
  if (!createdAt) return '—';
  const d = new Date(createdAt);
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AdminMessagesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [drives, setDrives] = useState([]);
  const [aspirants, setAspirants] = useState([]);
  const [selected, setSelected] = useState({ type: null, id: null, label: '', drive: null });
  const [driveMessages, setDriveMessages] = useState([]);
  const [individualMessages, setIndividualMessages] = useState([]);
  const [sendToMode, setSendToMode] = useState(SEND_TO_SHORTLISTED); // for job group: shortlisted only vs all applicants
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [flash, setFlash] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [individualSearch, setIndividualSearch] = useState('');
  const [sidebarTab, setSidebarTab] = useState('jobs');
  const [activePremiumCount, setActivePremiumCount] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    supabase.rpc('get_admin_users_summary').then(({ data }) => {
      if (data?.active_users != null) setActivePremiumCount(Number(data.active_users) || 0);
    });
  }, []);

  useEffect(() => {
    Promise.all([
      supabase.rpc('get_admin_drive_conversations').then(({ data }) => setDrives(Array.isArray(data) ? data : [])),
      supabase.rpc('get_aspirants_for_admin').then(({ data }) => setAspirants(Array.isArray(data) ? data : [])),
    ]).then(() => setLoading(false));
  }, []);

  useEffect(() => {
    const refreshLists = () => {
      supabase.rpc('get_admin_drive_conversations').then(({ data }) => setDrives(Array.isArray(data) ? data : []));
      supabase.rpc('get_aspirants_for_admin').then(({ data }) => setAspirants(Array.isArray(data) ? data : []));
      if (selected.type === 'drive' && selected.id) {
        supabase.rpc('get_admin_drive_messages', { p_job_id: selected.id }).then(({ data }) => {
          setDriveMessages(Array.isArray(data) ? data : []);
        });
      } else if (selected.type === 'individual' && selected.id) {
        supabase.rpc('get_admin_messages_to_aspirant', { p_aspirant_id: selected.id }).then(({ data }) => {
          setIndividualMessages(Array.isArray(data) ? data : []);
        });
      }
    };
    const unsubscribe = subscribeToAdminMessages(refreshLists, { channelId: 'admin-messages-page' });
    return unsubscribe;
  }, [selected.type, selected.id]);

  // Open individual chat when navigated with state (e.g. from Job Applicants "Send message")
  useEffect(() => {
    const openId = location.state?.openAspirantId;
    if (!openId) return;
    const aspirant = aspirants.find((a) => a.id === openId);
    const label =
      aspirant?.full_name ||
      aspirant?.email ||
      location.state?.openAspirantName ||
      'Aspirant';
    setSelected({ type: 'individual', id: openId, label, drive: null });
    setSidebarTab('people');
    navigate(location.pathname, { replace: true, state: {} });
  }, [aspirants, location.state?.openAspirantId, location.state?.openAspirantName, location.pathname, navigate]);

  useEffect(() => {
    if (!selected.type || !selected.id) {
      setDriveMessages([]);
      setIndividualMessages([]);
      return;
    }
    setLoadingMessages(true);
    const run = async () => {
      if (selected.type === 'drive') {
        await supabase.rpc('mark_admin_messages_read', { p_job_id: selected.id, p_aspirant_id: null });
        const { data } = await supabase.rpc('get_admin_drive_messages', { p_job_id: selected.id });
        setDriveMessages(Array.isArray(data) ? data : []);
        setIndividualMessages([]);
        const { data: drivesData } = await supabase.rpc('get_admin_drive_conversations');
        setDrives(Array.isArray(drivesData) ? drivesData : []);
      } else if (selected.type === 'individual') {
        await supabase.rpc('mark_admin_messages_read', { p_job_id: null, p_aspirant_id: selected.id });
        const { data } = await supabase.rpc('get_admin_messages_to_aspirant', { p_aspirant_id: selected.id });
        setIndividualMessages(Array.isArray(data) ? data : []);
        setDriveMessages([]);
        const { data: aspirantsData } = await supabase.rpc('get_aspirants_for_admin');
        setAspirants(Array.isArray(aspirantsData) ? aspirantsData : []);
      } else {
        setDriveMessages([]);
        setIndividualMessages([]);
      }
      setLoadingMessages(false);
    };
    run();
  }, [selected.type, selected.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [driveMessages.length, individualMessages.length]);

  const showFlash = (type, text) => {
    setFlash({ type, text });
    setTimeout(() => setFlash({ type: '', text: '' }), 3000);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    if (selected.type === 'drive') {
      const rpc = sendToMode === SEND_TO_ALL_APPLICANTS ? 'send_message_to_job_applicants' : 'send_message_to_drive';
      const { data } = await supabase.rpc(rpc, { p_job_id: selected.id, p_body: text });
      setSending(false);
      if (data?.ok) {
        setBody('');
        const who = sendToMode === SEND_TO_ALL_APPLICANTS ? 'all applicants' : 'shortlisted';
        showFlash('success', `Sent to ${data.recipient_count} ${who}.`);
        supabase.rpc('get_admin_drive_messages', { p_job_id: selected.id }).then(({ data }) =>
          setDriveMessages(Array.isArray(data) ? data : [])
        );
      } else {
        showFlash('error', data?.error ?? 'Failed to send.');
      }
    } else if (selected.type === 'individual') {
      const { data } = await supabase.rpc('send_message', {
        p_to_aspirant_id: selected.id,
        p_subject: null,
        p_body: text,
        p_job_id: null,
      });
      setSending(false);
      if (data?.ok) {
        setBody('');
        showFlash('success', 'Message sent.');
        supabase.rpc('get_admin_messages_to_aspirant', { p_aspirant_id: selected.id }).then(({ data }) =>
          setIndividualMessages(Array.isArray(data) ? data : [])
        );
      } else {
        showFlash('error', data?.error ?? 'Failed to send.');
      }
    } else if (selected.type === 'broadcast') {
      const { data } = await supabase.rpc('send_message', {
        p_to_aspirant_id: null,
        p_subject: null,
        p_body: text,
        p_job_id: null,
      });
      setSending(false);
      if (data?.ok) {
        setBody('');
        showFlash('success', 'Platform broadcast sent to all aspirants.');
      } else {
        showFlash('error', data?.error ?? 'Failed to send.');
      }
    } else if (selected.type === 'premium') {
      const confirmed = window.confirm(
        `Send this message to all active premium members (Base, Silver, Gold with a valid subscription)?${
          activePremiumCount != null ? `\n\nAbout ${activePremiumCount} member(s) will receive a personal message.` : ''
        }\n\nSending runs on the server — you do not need to keep this page open while it completes.`,
      );
      if (!confirmed) {
        setSending(false);
        return;
      }
      const result = await sendMessageToActivePremiumMembers(supabase, text);
      setSending(false);
      if (result.ok) {
        setBody('');
        if (result.recipient_count === 0) {
          showFlash('error', 'No active premium members found.');
        } else {
          showFlash('success', `Sent to ${result.recipient_count} active premium member(s).`);
        }
      } else {
        showFlash('error', result.error ?? 'Failed to send.');
      }
    } else {
      setSending(false);
    }
  };

  const isDrive = selected.type === 'drive';
  const isIndividual = selected.type === 'individual';
  const isBroadcast = selected.type === 'broadcast';
  const isPremium = selected.type === 'premium';
  const canCompose = isDrive || isIndividual || isBroadcast || isPremium;
  const currentDrive = selected.drive || (isDrive ? drives.find((d) => d.job_id === selected.id) : null);

  const jobGroupsUnread = useMemo(
    () => drives.reduce((sum, d) => sum + Math.max(0, Number(d.unread_count) || 0), 0),
    [drives],
  );
  const peopleUnread = useMemo(
    () => aspirants.reduce((sum, a) => sum + Math.max(0, Number(a.unread_count) || 0), 0),
    [aspirants],
  );

  const filteredAspirants = useMemo(() => {
    const q = individualSearch.trim().toLowerCase();
    if (!q) return aspirants;
    return aspirants.filter(
      (a) =>
        (a.full_name || '').toLowerCase().includes(q) ||
        (a.email || '').toLowerCase().includes(q) ||
        (a.last_preview || '').toLowerCase().includes(q),
    );
  }, [aspirants, individualSearch]);

  const unreadAspirants = useMemo(
    () => filteredAspirants.filter((a) => (a.unread_count || 0) > 0),
    [filteredAspirants],
  );
  const readAspirants = useMemo(
    () => filteredAspirants.filter((a) => !(a.unread_count || 0)),
    [filteredAspirants],
  );

  const renderAspirantRow = (a) => {
    const unread = (a.unread_count || 0) > 0;
    return (
      <button
        key={a.id}
        type="button"
        onClick={() => {
          setSidebarTab('people');
          setSelected({ type: 'individual', id: a.id, label: a.full_name || a.email, drive: null });
        }}
        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
          isIndividual && selected.id === a.id
            ? 'bg-indigo-100 text-indigo-900 font-medium'
            : unread
              ? 'bg-amber-50/80 text-slate-900 hover:bg-amber-50'
              : 'text-slate-700 hover:bg-slate-100'
        }`}
      >
        <div className="flex items-start gap-2">
          <HiChatBubbleLeftRight className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
          <span className="min-w-0 flex-1">
            <span className={`flex items-center gap-2 truncate ${unread ? 'font-bold' : 'font-medium'}`}>
              {a.full_name || a.email}
              {unread ? (
                <span className="bg-indigo-600 text-white text-xs font-semibold min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center shrink-0">
                  {a.unread_count > 99 ? '99+' : a.unread_count}
                </span>
              ) : null}
            </span>
            {a.last_preview ? (
              <span className={`mt-0.5 block truncate text-xs ${unread ? 'text-slate-700' : 'text-slate-500'}`}>
                {a.last_preview}
              </span>
            ) : null}
          </span>
        </div>
      </button>
    );
  };

  const sidebarTabs = [
    { id: 'jobs', label: 'Job groups', unread: jobGroupsUnread },
    { id: 'people', label: 'People', unread: peopleUnread },
    { id: 'broadcast', label: 'Broadcast', unread: 0 },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[400px]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
          <p className="mt-1 text-sm text-slate-500">
            Job groups, personal NTH Team chats, and platform broadcasts. Help desk tickets are in{' '}
            <Link to="/admin/help-desk" className="font-medium text-indigo-600 hover:underline">
              Help desk
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <aside className="flex w-[min(100%,20rem)] shrink-0 flex-col min-h-0 border-r border-slate-200 bg-slate-50/80 sm:w-80">
          {/* Pinned section tabs — no scroll */}
          <div className="shrink-0 border-b border-slate-200 bg-white p-2">
            <div className="grid grid-cols-3 gap-1">
              {sidebarTabs.map((tab) => {
                const active = sidebarTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSidebarTab(tab.id)}
                    className={`relative rounded-lg px-2 py-2 text-center text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span className="block leading-tight">{tab.label}</span>
                    {tab.unread > 0 ? (
                      <span
                        className={`mt-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          active ? 'bg-white/20 text-white' : 'bg-indigo-600 text-white'
                        }`}
                      >
                        {tab.unread > 99 ? '99+' : tab.unread}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pinned search — People tab only */}
          {sidebarTab === 'people' ? (
            <div className="shrink-0 border-b border-slate-200 bg-white px-2 py-2">
              <input
                type="search"
                value={individualSearch}
                onChange={(e) => setIndividualSearch(e.target.value)}
                placeholder="Search name or email…"
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          ) : null}

          {/* One section scrolls at a time */}
          <div className="nth-scroll-y min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
            {sidebarTab === 'jobs' ? (
              <>
                <p className="px-1 pb-2 text-[11px] leading-snug text-slate-500">
                  One group per job — messages go only to that job&apos;s applicants.
                </p>
                {loading ? (
                  <div className="flex items-center gap-2 px-2 py-1 text-sm text-slate-400">
                    <LoaderDots size="sm" /> Loading…
                  </div>
                ) : drives.length === 0 ? (
                  <p className="px-2 py-4 text-center text-sm text-slate-400">No jobs with applicants yet.</p>
                ) : (
                  <div className="space-y-1">
                    {drives.map((d) => {
                      const unread = (d.unread_count || 0) > 0;
                      return (
                        <button
                          key={d.job_id}
                          type="button"
                          onClick={() => {
                            setSidebarTab('jobs');
                            setSelected({
                              type: 'drive',
                              id: d.job_id,
                              label: `${d.job_title} – ${d.company_name}`,
                              drive: d,
                            });
                          }}
                          className={`flex w-full min-w-0 items-start gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                            isDrive && selected.id === d.job_id
                              ? 'bg-indigo-100 text-indigo-900 ring-1 ring-indigo-200'
                              : unread
                                ? 'bg-amber-50/80 text-slate-900 hover:bg-amber-50'
                                : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <HiUserGroup className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          <span className="min-w-0 flex-1 overflow-hidden">
                            <span className="flex min-w-0 items-center gap-2 font-medium">
                              <span className="truncate">{d.job_title}</span>
                              {unread ? (
                                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-semibold text-white">
                                  {d.unread_count > 99 ? '99+' : d.unread_count}
                                </span>
                              ) : null}
                            </span>
                            <span className="block truncate text-xs text-slate-500">{d.company_name}</span>
                            <span className="block truncate text-xs text-slate-500">
                              {(d.shortlisted_count || 0)} shortlisted · {(d.applicant_count || 0)} applicants
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : null}

            {sidebarTab === 'people' ? (
              <>
                <p className="px-1 pb-2 text-[11px] leading-snug text-slate-500">
                  Personal NTH Team chats — aspirants who messaged you or got a direct reply.
                </p>
                {loading ? (
                  <div className="flex items-center gap-2 px-2 py-1 text-sm text-slate-400">
                    <LoaderDots size="sm" /> Loading…
                  </div>
                ) : filteredAspirants.length === 0 ? (
                  <p className="px-2 py-4 text-center text-sm text-slate-400">
                    {aspirants.length === 0 ? 'No personal chats yet.' : 'No matches for your search.'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {unreadAspirants.length > 0 ? (
                      <div>
                        <p className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
                          Needs reply · {unreadAspirants.length}
                        </p>
                        <div className="space-y-1">{unreadAspirants.map(renderAspirantRow)}</div>
                      </div>
                    ) : null}
                    {readAspirants.length > 0 ? (
                      <div>
                        {unreadAspirants.length > 0 ? (
                          <p className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Earlier · {readAspirants.length}
                          </p>
                        ) : null}
                        <div className="space-y-1">{readAspirants.map(renderAspirantRow)}</div>
                      </div>
                    ) : null}
                  </div>
                )}
              </>
            ) : null}

            {sidebarTab === 'broadcast' ? (
              <div className="space-y-2">
                <p className="px-1 pb-1 text-[11px] leading-snug text-slate-500">
                  One-way messages to many aspirants at once. Not a chat thread.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSidebarTab('broadcast');
                    setSelected({
                      type: 'premium',
                      id: PREMIUM_BROADCAST_ID,
                      label: 'Active premium members',
                      drive: null,
                    });
                  }}
                  className={`flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    isPremium ? 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <HiSparkles className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block">Active premium members</span>
                    <span className="text-xs font-normal text-slate-500">
                      Base / Silver / Gold · valid subscription
                      {activePremiumCount != null ? ` · ~${activePremiumCount}` : ''}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSidebarTab('broadcast');
                    setSelected({
                      type: 'broadcast',
                      id: BROADCAST_ID,
                      label: 'All aspirants (entire platform)',
                      drive: null,
                    });
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    isBroadcast ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-200' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <HiMegaphone className="h-4 w-4 shrink-0" />
                  <span>All aspirants</span>
                </button>
              </div>
            ) : null}
          </div>
        </aside>

        {/* Right: conversation + compose */}
        <main className="flex-1 flex flex-col min-w-0">
          {!canCompose ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm p-6">
              Select a chat from <strong className="font-medium">Job groups</strong>, <strong className="font-medium">People</strong>, or <strong className="font-medium">Broadcast</strong> on the left.
            </div>
          ) : (
            <>
              <header className="shrink-0 px-4 py-3 border-b border-slate-200 bg-white">
                <h2 className="font-semibold text-slate-900 truncate">{selected.label}</h2>
                {isDrive && currentDrive && (
                  <p className="text-sm text-slate-500">
                    Group for this job only: {(currentDrive.shortlisted_count || 0)} shortlisted, {(currentDrive.applicant_count || 0)} total applicants
                  </p>
                )}
                {isIndividual && aspirants.find((a) => a.id === selected.id)?.email && (
                  <p className="text-sm text-slate-500 truncate">{aspirants.find((a) => a.id === selected.id).email}</p>
                )}
                {isBroadcast && <p className="text-sm text-slate-500">Every aspirant on the platform will receive this message.</p>}
                {isPremium && (
                  <p className="text-sm text-slate-500">
                    Personal message to each active premium member
                    {activePremiumCount != null ? ` (~${activePremiumCount})` : ''}.
                  </p>
                )}
              </header>

              <div className="flex-1 overflow-auto p-4 flex flex-col gap-2 min-h-0 bg-slate-50/50">
                {loadingMessages ? (
                  <div className="flex items-center gap-2 text-slate-500 text-sm py-4"><LoaderDots size="md" /> Loading messages…</div>
                ) : isDrive ? (
                  driveMessages.length === 0 ? (
                    <p className="text-slate-500 text-sm">No messages in this job group yet. Choose who to send to below and send one.</p>
                  ) : (
                    <>
                      {driveMessages.map((m) => (
                        <div
                          key={m.batch_id}
                          className={m.from_aspirant_id ? 'max-w-[85%] self-start rounded-lg bg-white border border-slate-200 p-3 text-left shadow-sm' : 'max-w-[85%] self-end rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-left shadow-sm'}
                        >
                          <p className="text-xs text-slate-500 mb-1">
                            {m.from_aspirant_id ? (
                              <>{m.aspirant_name || 'Aspirant'} · {formatTime(m.created_at)}{m.admin_read_at ? ' · Read' : ''}</>
                            ) : (
                              <>You · Sent to {m.recipient_count} member(s) · {formatTime(m.created_at)}</>
                            )}
                          </p>
                          <p className="text-slate-800 whitespace-pre-wrap">{m.body}</p>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </>
                  )
                ) : isIndividual ? (
                  individualMessages.length === 0 ? (
                    <p className="text-slate-500 text-sm">No 1:1 messages yet. Send one below. (Group messages appear only in job groups.)</p>
                  ) : (
                    <>
                      {individualMessages.map((m) => (
                        <div
                          key={m.id}
                          className={m.from_aspirant ? 'max-w-[85%] self-start rounded-lg bg-white border border-slate-200 p-3 text-left shadow-sm' : 'max-w-[85%] self-end rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-left shadow-sm'}
                        >
                          <p className="text-xs text-slate-500 mb-1">
                            {formatTime(m.created_at)}{m.from_aspirant && m.admin_read_at ? ' · Read' : ''}
                          </p>
                          <p className="text-slate-800 whitespace-pre-wrap">{m.body}</p>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </>
                  )
                ) : isBroadcast ? (
                  <p className="text-slate-500 text-sm">Compose below to send to all aspirants on the platform (including users without an active plan).</p>
                ) : isPremium ? (
                  <p className="text-slate-500 text-sm">
                    Compose below to send one personal message to each active premium member (Base, Silver, or Gold with a valid subscription).
                    They will see it in Dashboard → Messages → Naveen Talent Hub Team.
                    Delivery runs on the server in one step — safe to navigate away after you see success.
                    {activePremiumCount != null ? ` About ${activePremiumCount} recipient(s).` : ''}
                  </p>
                ) : null}
              </div>

              {flash.text && (
                <div className={`shrink-0 px-4 py-2 text-sm ${flash.type === 'error' ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'}`}>
                  {flash.text}
                </div>
              )}

              {/* For job group: choose shortlisted only vs all applicants */}
              {isDrive && currentDrive && (
                <div className="shrink-0 px-4 py-2 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-xs font-medium text-slate-600 mb-1">Send to</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="sendTo"
                        checked={sendToMode === SEND_TO_SHORTLISTED}
                        onChange={() => setSendToMode(SEND_TO_SHORTLISTED)}
                        className="text-indigo-600"
                      />
                      <span className="text-sm">Shortlisted only ({(currentDrive.shortlisted_count || 0)})</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="sendTo"
                        checked={sendToMode === SEND_TO_ALL_APPLICANTS}
                        onChange={() => setSendToMode(SEND_TO_ALL_APPLICANTS)}
                        className="text-indigo-600"
                      />
                      <span className="text-sm">All applicants ({(currentDrive.applicant_count || 0)})</span>
                    </label>
                  </div>
                </div>
              )}

              <form onSubmit={handleSend} className="shrink-0 p-4 border-t border-slate-200 bg-slate-50/50">
                <div className="flex gap-2">
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Type a message..."
                    rows={2}
                    className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={sending || !body.trim()}
                    className="nth-btn-primary self-end px-4 py-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
