import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { PageLoader } from '../../../components/ui/Loader';
import { isMessageSoundMuted, setMessageSoundMuted } from '../../../lib/messageSound';
import { HiUserGroup, HiChatBubbleLeftRight, HiCheck, HiSpeakerWave, HiSpeakerXMark } from 'react-icons/hi2';

const NTH_TEAM_KEY = '__nth_team__';

function formatTime(createdAt) {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatChatTime(createdAt) {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  const now = new Date();
  const diffDays = Math.floor((now - d) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// Group messages into WhatsApp-style chats: NTH Team (platform + personal) + one per job
function buildChats(messages) {
  const byKey = new Map();

  for (const m of messages) {
    const key = m.source === 'job_group' && m.job_id ? m.job_id : NTH_TEAM_KEY;
    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        label: key === NTH_TEAM_KEY ? 'Naveen Talent Hub Team' : [m.job_title, m.company_name].filter(Boolean).join(' – ') || 'Job',
        icon: key === NTH_TEAM_KEY ? HiChatBubbleLeftRight : HiUserGroup,
        messages: [],
      });
    }
    byKey.get(key).messages.push(m);
  }

  // Sort messages inside each chat (newest last for chat view); compute unread per chat
  for (const chat of byKey.values()) {
    chat.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    chat.unreadCount = chat.messages.filter((m) => !m.from_me && !m.read_at).length;
  }

  return Array.from(byKey.values()).sort((a, b) => {
    const tA = a.messages[a.messages.length - 1]?.created_at || 0;
    const tB = b.messages[b.messages.length - 1]?.created_at || 0;
    return new Date(tB) - new Date(tA);
  });
}

function lastPreview(body, maxLen = 40) {
  if (!body) return 'No messages';
  const t = body.replace(/\n/g, ' ').trim();
  return t.length <= maxLen ? t : t.slice(0, maxLen) + '…';
}

export default function MessagesPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChatKey, setSelectedChatKey] = useState(null);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [messageUsage, setMessageUsage] = useState({ used: 0, limit: 0, active: false });
  const [flash, setFlash] = useState('');
  const [soundMuted, setSoundMuted] = useState(() => isMessageSoundMuted());
  const chatEndRef = useRef(null);

  const toggleSoundMuted = () => {
    const next = !soundMuted;
    setMessageSoundMuted(next);
    setSoundMuted(next);
  };

  const loadMessages = () => {
    supabase.rpc('get_my_messages').then(({ data }) => {
      setMessages(Array.isArray(data) ? data : []);
    });
  };

  const loadUsage = () => {
    supabase.rpc('get_aspirant_daily_message_usage').then(({ data }) => {
      if (data && typeof data === 'object') setMessageUsage({ used: data.used ?? 0, limit: data.limit ?? 0, active: !!data.active });
    });
  };

  useEffect(() => {
    Promise.all([
      supabase.rpc('get_my_messages').then(({ data }) => setMessages(Array.isArray(data) ? data : [])),
      supabase.rpc('get_aspirant_daily_message_usage').then(({ data }) => {
        if (data && typeof data === 'object') setMessageUsage({ used: data.used ?? 0, limit: data.limit ?? 0, active: !!data.active });
      }),
    ]).then(() => setLoading(false));
  }, []);

  // Poll for message updates so read receipts (admin_read_at) and new messages update while viewing
  useEffect(() => {
    const interval = setInterval(() => loadMessages(), 10000);
    return () => clearInterval(interval);
  }, []);

  const chats = buildChats(messages);
  const selectedChat = selectedChatKey ? chats.find((c) => c.key === selectedChatKey) : null;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChat?.messages?.length]);

  // Mark this chat as read when aspirant opens it (jobId from key so we don't depend on selectedChat)
  useEffect(() => {
    if (!selectedChatKey) return;
    const jobId = selectedChatKey === NTH_TEAM_KEY ? null : selectedChatKey;
    supabase.rpc('mark_aspirant_messages_read', { p_job_id: jobId }).then(() => loadMessages());
  }, [selectedChatKey]);

  const canReply = messageUsage.active && (messageUsage.limit < 0 || messageUsage.used < messageUsage.limit);
  const jobIdForReply = selectedChat && selectedChat.key !== NTH_TEAM_KEY ? selectedChat.key : null;

  const handleSendReply = async (e) => {
    e.preventDefault();
    const body = replyBody.trim();
    if (!body || sending || !canReply) return;
    setSending(true);
    const { data } = await supabase.rpc('send_aspirant_reply', { p_body: body, p_job_id: jobIdForReply });
    setSending(false);
    if (data?.ok) {
      setReplyBody('');
      setFlash('');
      loadMessages();
      loadUsage();
    } else {
      setFlash(data?.error || 'Failed to send');
    }
  };

  if (loading) return <PageLoader size="md" label="Loading messages…" className="py-8" />;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[400px]">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h1 className="text-2xl font-bold text-[rgb(var(--nth-text-primary-light))]">Messages</h1>
        <button
          type="button"
          onClick={toggleSoundMuted}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          title={soundMuted ? 'Unmute new message sound' : 'Mute new message sound'}
          aria-label={soundMuted ? 'Unmute sound' : 'Mute sound'}
        >
          {soundMuted ? (
            <HiSpeakerXMark className="w-5 h-5" />
          ) : (
            <HiSpeakerWave className="w-5 h-5" />
          )}
        </button>
      </div>
      <p className="text-sm text-[rgb(var(--nth-text-secondary-light))] mb-4">
        Chats from the Naveen Talent Hub team and job groups. Base 1 / Silver 3 / Gold 5 replies per day.
      </p>

      {messages.length === 0 ? (
        <div className="flex-1 rounded-xl border border-[rgb(var(--nth-border-light))] bg-white flex items-center justify-center p-8 text-[rgb(var(--nth-text-muted-light))]">
          No messages yet.
        </div>
      ) : (
        <div className="flex-1 flex min-h-0 rounded-xl border border-[rgb(var(--nth-border-light))] bg-white overflow-hidden shadow-sm">
          {/* Left: chat list */}
          <aside className="w-72 shrink-0 flex flex-col border-r border-[rgb(var(--nth-border-light))] bg-[rgb(var(--nth-bg-soft))]">
            <div className="p-2 bg-white border-b border-[rgb(var(--nth-border-light))]">
              <p className="text-xs font-semibold text-[rgb(var(--nth-text-muted-light))] uppercase tracking-wider px-2 py-1">
                Chats
              </p>
            </div>
            <ul className="flex-1 overflow-auto">
              {chats.map((chat) => {
                const last = chat.messages[chat.messages.length - 1];
                const isSelected = selectedChat?.key === chat.key;
                const Icon = chat.icon;
                return (
                  <li key={chat.key}>
                    <button
                      type="button"
                      onClick={() => setSelectedChatKey(chat.key)}
                      className={`w-full text-left px-3 py-3 flex items-start gap-3 hover:bg-white/80 transition-colors border-b border-[rgb(var(--nth-border-light))]/50 ${
                        isSelected ? 'bg-white border-l-2 border-l-[hsl(var(--nth-primary))]' : ''
                      }`}
                    >
                      <span className="w-10 h-10 rounded-full bg-[hsl(var(--nth-primary))]/15 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-[hsl(var(--nth-primary))]" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <p className="font-medium text-[rgb(var(--nth-text-primary-light))] truncate flex items-center gap-2">
                          {chat.label}
                          {chat.unreadCount > 0 && (
                            <span className="bg-[hsl(var(--nth-primary))] text-white text-xs font-semibold min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center">
                              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-[rgb(var(--nth-text-muted-light))] truncate mt-0.5">
                          {lastPreview(last?.body)}
                        </p>
                      </span>
                      <span className="text-[10px] text-[rgb(var(--nth-text-muted-light))] shrink-0">
                        {formatChatTime(last?.created_at)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Right: chat thread + reply or placeholder */}
          <main className="flex-1 flex flex-col min-w-0 bg-[rgb(240,242,245)]">
            {!selectedChat ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center text-[rgb(var(--nth-text-muted-light))]">
                  <HiChatBubbleLeftRight className="w-14 h-14 mx-auto mb-3 opacity-40" />
                  <p className="font-medium text-[rgb(var(--nth-text-primary-light))]">Select a conversation</p>
                  <p className="text-sm mt-1">Choose a chat from the list to view messages</p>
                </div>
              </div>
            ) : (
              <>
                <header className="shrink-0 px-4 py-3 bg-white border-b border-[rgb(var(--nth-border-light))] flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-[hsl(var(--nth-primary))]/15 flex items-center justify-center">
                    {selectedChat.key === NTH_TEAM_KEY ? (
                      <HiChatBubbleLeftRight className="w-5 h-5 text-[hsl(var(--nth-primary))]" />
                    ) : (
                      <HiUserGroup className="w-5 h-5 text-[hsl(var(--nth-primary))]" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-[rgb(var(--nth-text-primary-light))] truncate">
                      {selectedChat.label}
                    </h2>
                    <p className="text-xs text-[rgb(var(--nth-text-muted-light))]">
                      {messageUsage.limit >= 0
                        ? `${messageUsage.used} / ${messageUsage.limit} replies today`
                        : 'Replies allowed'}
                    </p>
                  </div>
                </header>

                <div className="flex-1 overflow-auto p-4 space-y-2 flex flex-col">
                  {selectedChat.messages.map((m) => (
                    <div key={m.id} className={m.from_me ? 'flex justify-end' : 'flex justify-start'}>
                      <div className="max-w-[85%] sm:max-w-[75%]">
                        <div
                          className={
                            m.from_me
                              ? 'rounded-lg rounded-tr-none bg-[hsl(var(--nth-primary))] text-white shadow-sm px-3 py-2.5 inline-block'
                              : 'rounded-lg rounded-tl-none bg-white shadow-sm border border-[rgb(var(--nth-border-light))]/60 px-3 py-2.5 inline-block'
                          }
                        >
                          <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                          <div className={`flex items-center justify-end gap-1 mt-1.5 ${m.from_me ? 'text-white/80' : 'text-[rgb(var(--nth-text-muted-light))]'}`}>
                            <span className="text-[10px]">{formatTime(m.created_at)}</span>
                            {m.from_me && (
                              <span className="inline-flex items-center gap-0.5" title={m.admin_read_at ? 'Read' : 'Sent'}>
                                {m.admin_read_at ? (
                                  <>
                                    <HiCheck className="w-3.5 h-3.5 opacity-90" />
                                    <HiCheck className="w-3.5 h-3.5 opacity-90 -ml-1.5" />
                                  </>
                                ) : (
                                  <HiCheck className="w-3.5 h-3.5 opacity-80" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {flash && (
                  <div className="shrink-0 px-4 py-2 text-sm text-red-600 bg-red-50">{flash}</div>
                )}

                <form onSubmit={handleSendReply} className="shrink-0 p-3 bg-white border-t border-[rgb(var(--nth-border-light))]">
                  <div className="flex gap-2 items-end">
                    <textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder={canReply ? 'Type a reply...' : messageUsage.active ? 'Daily limit reached. Try again tomorrow.' : 'Active plan required to reply.'}
                      rows={2}
                      disabled={!canReply || sending}
                      className="flex-1 min-w-0 px-3 py-2 border border-[rgb(var(--nth-border-light))] rounded-lg bg-white text-[rgb(var(--nth-text-primary-light))] placeholder-[rgb(var(--nth-text-muted-light))] resize-none disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-[hsl(var(--nth-primary))] focus:border-[hsl(var(--nth-primary))]"
                    />
                    <button
                      type="submit"
                      disabled={sending || !replyBody.trim() || !canReply}
                      className="nth-btn-primary px-4 py-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? 'Sending…' : 'Send'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
