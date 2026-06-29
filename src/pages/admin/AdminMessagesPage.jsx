import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { subscribeToAdminMessages } from '../../lib/messageRealtime';
import { Loader, LoaderDots } from '../../components/ui/Loader';
import { HiUserGroup, HiMegaphone, HiChatBubbleLeftRight } from 'react-icons/hi2';

const BROADCAST_ID = '__broadcast__';
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
  const chatEndRef = useRef(null);

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
    if (!openId || !aspirants.length) return;
    const aspirant = aspirants.find((a) => a.id === openId);
    if (aspirant) {
      setSelected({ type: 'individual', id: aspirant.id, label: aspirant.full_name || aspirant.email || 'Chat', drive: null });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [aspirants, location.state?.openAspirantId, location.pathname, navigate]);

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
    } else {
      setSending(false);
    }
  };

  const isDrive = selected.type === 'drive';
  const isIndividual = selected.type === 'individual';
  const isBroadcast = selected.type === 'broadcast';
  const canCompose = isDrive || isIndividual || isBroadcast;
  const currentDrive = selected.drive || (isDrive ? drives.find((d) => d.job_id === selected.id) : null);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[400px]">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Messages</h1>
      <p className="text-slate-600 mb-4">
        Job groups = messages only to applicants for that job. Choose shortlisted only or all applicants per job.
      </p>

      <div className="flex flex-1 min-h-0 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {/* Left: conversation list – job groups (like WhatsApp groups) then individuals */}
        <aside className="w-80 shrink-0 flex flex-col border-r border-slate-200 bg-slate-50/50">
          <div className="p-2 border-b border-slate-200 bg-white">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-1">Job groups</p>
            <p className="text-xs text-slate-400 px-2 pb-1">One group per job – only that job’s applicants receive messages.</p>
            {loading ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm px-2 py-1"><LoaderDots size="sm" /> Loading…</div>
            ) : drives.length === 0 ? (
              <p className="text-slate-400 text-sm px-2 py-1">No jobs with applicants yet.</p>
            ) : (
              drives.map((d) => (
                <button
                  key={d.job_id}
                  type="button"
                  onClick={() => setSelected({
                    type: 'drive',
                    id: d.job_id,
                    label: `${d.job_title} – ${d.company_name}`,
                    drive: d,
                  })}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-start gap-2 ${
                    isDrive && selected.id === d.job_id
                      ? 'bg-indigo-100 text-indigo-900 ring-1 ring-indigo-200'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <HiUserGroup className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="flex-1 min-w-0">
                    <span className="font-medium truncate flex items-center gap-2">
                      {d.job_title}
                      {(d.unread_count || 0) > 0 && (
                        <span className="bg-indigo-600 text-white text-xs font-semibold min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center">
                          {d.unread_count > 99 ? '99+' : d.unread_count}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-slate-500 block truncate">{d.company_name}</span>
                    <span className="text-xs text-slate-500">{(d.shortlisted_count || 0)} shortlisted · {(d.applicant_count || 0)} applicants</span>
                  </span>
                </button>
              ))
            )}
          </div>
          <div className="flex-1 overflow-auto p-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-1">Individual chat</p>
            {aspirants.length === 0 ? (
              <p className="text-slate-400 text-sm px-2 py-1">No aspirants.</p>
            ) : (
              aspirants.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelected({ type: 'individual', id: a.id, label: a.full_name || a.email, drive: null })}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                    isIndividual && selected.id === a.id
                      ? 'bg-indigo-100 text-indigo-900 font-medium'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <HiChatBubbleLeftRight className="w-4 h-4 shrink-0 text-slate-400" />
                  <span className="flex-1 truncate flex items-center gap-2">
                    {a.full_name || a.email}
                    {(a.unread_count || 0) > 0 && (
                      <span className="bg-indigo-600 text-white text-xs font-semibold min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center shrink-0">
                        {a.unread_count > 99 ? '99+' : a.unread_count}
                      </span>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
          <div className="p-2 border-t border-slate-200 bg-white">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-1">Platform-wide</p>
            <button
              type="button"
              onClick={() => setSelected({ type: 'broadcast', id: BROADCAST_ID, label: 'All aspirants (entire platform)', drive: null })}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                isBroadcast ? 'bg-amber-100 text-amber-900' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <HiMegaphone className="w-4 h-4 shrink-0" />
              All aspirants
            </button>
          </div>
        </aside>

        {/* Right: conversation + compose */}
        <main className="flex-1 flex flex-col min-w-0">
          {!canCompose ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm p-6">
              Select a job group, an individual, or platform broadcast.
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
                  <p className="text-slate-500 text-sm">Compose below to send to all aspirants on the platform (use job groups to message only that job’s applicants).</p>
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
