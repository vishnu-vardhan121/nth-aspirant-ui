import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { PageLoader } from '../../../components/ui/Loader';
import { isMessageSoundMuted, setMessageSoundMuted, primeMessageSound } from '../../../lib/messageSound';
import { subscribeToAspirantMessages } from '../../../lib/messageRealtime';
import { MESSAGES_INVALIDATE_EVENT } from '../../../lib/messagesEvents';
import {
  NTH_TEAM_KEY,
  MOCK_UPDATES_KEY,
  INTERVIEWER_CHAT_PREFIX,
  getChatKeyForMessage,
  countUnreadInChat,
  markMessagesReadOptimistic,
  markChatReadOnServer,
} from '../../../lib/aspirantChatKeys';
import { HiUserGroup, HiChatBubbleLeftRight, HiCheck, HiSpeakerWave, HiSpeakerXMark, HiArrowLeft, HiAcademicCap } from 'react-icons/hi2';
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
    const key = getChatKeyForMessage(m);
    const interviewerKey = key.startsWith(INTERVIEWER_CHAT_PREFIX) ? key : null;
    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        label:
          key === NTH_TEAM_KEY
            ? 'Naveen Talent Hub Team'
            : key === MOCK_UPDATES_KEY
              ? 'Mock updates'
              : interviewerKey
                ? (m.interviewer_name ? `Mock: ${m.interviewer_name}` : 'Mock interviewer')
                : [m.job_title, m.company_name].filter(Boolean).join(' – ') || 'Job',
        icon:
          key === NTH_TEAM_KEY
            ? HiChatBubbleLeftRight
            : key === MOCK_UPDATES_KEY
              ? HiAcademicCap
              : interviewerKey
                ? HiAcademicCap
                : HiUserGroup,        messages: [],
        isInterviewerChat: !!interviewerKey,
      });
    }
    byKey.get(key).messages.push(m);
  }

  // Oldest first in thread (WhatsApp-style); chat list sorted by latest activity
  for (const chat of byKey.values()) {
    chat.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    chat.unreadCount = chat.messages.filter((m) => !m.from_me && !m.read_at).length;
    chat.lastMessage = chat.messages[chat.messages.length - 1] ?? null;
  }

  return Array.from(byKey.values()).sort((a, b) => {
    const tA = a.lastMessage?.created_at || 0;
    const tB = b.lastMessage?.created_at || 0;
    return new Date(tB) - new Date(tA);
  });
}

/** Always offer NTH Team thread so aspirants can start a help conversation. */
function ensureNthTeamChat(chats) {
  if (chats.some((c) => c.key === NTH_TEAM_KEY)) return chats;
  return [
    {
      key: NTH_TEAM_KEY,
      label: 'Naveen Talent Hub Team',
      icon: HiChatBubbleLeftRight,
      messages: [],
      isInterviewerChat: false,
      unreadCount: 0,
      lastMessage: null,
    },
    ...chats,
  ];
}

function lastPreview(body, maxLen = 40) {
  if (!body) return 'No messages';
  const t = body.replace(/\n/g, ' ').trim();
  return t.length <= maxLen ? t : t.slice(0, maxLen) + '…';
}

export default function MessagesPage() {
  const [searchParams] = useSearchParams();
  const helpMode = searchParams.get('help') === '1';
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChatKey, setSelectedChatKey] = useState(null);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [messageUsage, setMessageUsage] = useState({ used: 0, limit: 0, active: false });
  const [flash, setFlash] = useState('');
  const [soundMuted, setSoundMuted] = useState(() => isMessageSoundMuted());
  const chatScrollRef = useRef(null);
  const selectedChatKeyRef = useRef(null);
  const markingRef = useRef(false);

  const toggleSoundMuted = () => {
    const next = !soundMuted;
    setMessageSoundMuted(next);
    setSoundMuted(next);
    if (!next) primeMessageSound();
  };

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase.rpc('get_my_messages');
    const list = Array.isArray(data) ? data : [];
    setMessages(list);
    return list;
  }, []);

  const markChatRead = useCallback(
    async (chatKey, { optimistic = true } = {}) => {
      if (!chatKey || markingRef.current) return;
      markingRef.current = true;
      try {
        if (optimistic) {
          setMessages((prev) => markMessagesReadOptimistic(prev, chatKey));
        }
        const { error } = await markChatReadOnServer(supabase, chatKey);
        if (error) {
          console.warn('[Messages] mark read failed:', error.message);
        }
        await fetchMessages();
      } finally {
        markingRef.current = false;
      }
    },
    [fetchMessages],
  );

  const loadMessages = useCallback(() => {
    void fetchMessages().then((list) => {
      const key = selectedChatKeyRef.current;
      if (key && countUnreadInChat(list, key) > 0) {
        void markChatRead(key, { optimistic: false });
      }
    });
  }, [fetchMessages, markChatRead]);
  const loadUsage = () => {
    supabase.rpc('get_aspirant_daily_message_usage').then(({ data }) => {
      if (data && typeof data === 'object') setMessageUsage({ used: data.used ?? 0, limit: data.limit ?? 0, active: !!data.active });
    });
  };

  useEffect(() => {
    Promise.all([
      fetchMessages(),
      supabase.rpc('get_aspirant_daily_message_usage').then(({ data }) => {
        if (data && typeof data === 'object') setMessageUsage({ used: data.used ?? 0, limit: data.limit ?? 0, active: !!data.active });
      }),
    ]).then(() => setLoading(false));
  }, [fetchMessages]);

  useEffect(() => {
    selectedChatKeyRef.current = selectedChatKey;
  }, [selectedChatKey]);

  const handleSelectChat = useCallback(
    (chatKey) => {
      setSelectedChatKey(chatKey);
      selectedChatKeyRef.current = chatKey;
      void markChatRead(chatKey);
    },
    [markChatRead],
  );
  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      const uid = session?.user?.id;
      if (!uid) return;

      unsubscribe = subscribeToAspirantMessages(
        uid,
        () => {
          loadMessages();
        },
        { channelId: `messages-page-${uid}` },
      );
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [loadMessages]);

  useEffect(() => {
    const onInvalidate = () => loadMessages();
    window.addEventListener(MESSAGES_INVALIDATE_EVENT, onInvalidate);
    return () => window.removeEventListener(MESSAGES_INVALIDATE_EVENT, onInvalidate);
  }, [loadMessages]);
  const chats = ensureNthTeamChat(buildChats(messages));
  const selectedChat = selectedChatKey ? chats.find((c) => c.key === selectedChatKey) : null;

  useEffect(() => {
    if (!loading && helpMode) {
      handleSelectChat(NTH_TEAM_KEY);
    }
  }, [loading, helpMode, handleSelectChat]);

  // Open the chat with the most unread messages first (unless help mode).
  useEffect(() => {
    if (loading || helpMode || selectedChatKey) return;
    const built = ensureNthTeamChat(buildChats(messages));
    const withUnread = built.filter((c) => c.unreadCount > 0);
    if (withUnread.length > 0) {
      const top = withUnread.sort((a, b) => b.unreadCount - a.unreadCount)[0];
      handleSelectChat(top.key);
    }
  }, [loading, helpMode, messages, selectedChatKey, handleSelectChat]);
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [selectedChatKey, selectedChat?.messages?.length]);

  const isInterviewerChat = Boolean(selectedChat?.isInterviewerChat);  const canReply =
    isInterviewerChat || (messageUsage.active && (messageUsage.limit < 0 || messageUsage.used < messageUsage.limit));
  const jobIdForReply =
    selectedChat &&
    selectedChat.key !== NTH_TEAM_KEY &&
    selectedChat.key !== MOCK_UPDATES_KEY &&
    !isInterviewerChat
      ? selectedChat.key
      : null;  const mockRegistrationIdForReply = isInterviewerChat
    ? selectedChat.key.slice(INTERVIEWER_CHAT_PREFIX.length)
    : null;

  const handleSendReply = async (e) => {
    e.preventDefault();
    const body = replyBody.trim();
    if (!body || sending || !canReply) return;
    setSending(true);
    const { data } = isInterviewerChat
      ? await supabase.rpc('send_aspirant_reply_to_interviewer', {
          p_mock_registration_id: mockRegistrationIdForReply,
          p_body: body,
        })
      : await supabase.rpc('send_aspirant_reply', { p_body: body, p_job_id: jobIdForReply });
    setSending(false);
    if (data?.ok) {
      setReplyBody('');
      setFlash('');
      loadMessages();
      if (!isInterviewerChat) loadUsage();
    } else {
      setFlash(data?.error || 'Failed to send');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply(e);
    }
  };

  // On mobile: show chat list when no chat selected, show thread when a chat is selected
  const showListOnMobile = !selectedChatKey;

  if (loading) return <PageLoader size="md" label="Loading messages…" className="py-8" />;

  return (
    <div className="flex flex-col min-h-[280px] h-[calc(100dvh-11rem)] sm:h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold text-[rgb(var(--nth-text-primary-light))]">
          {helpMode ? 'Help & support' : 'Messages'}
        </h1>
        <button
          type="button"
          onClick={toggleSoundMuted}
          className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
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
        {helpMode
          ? 'Chat with the Naveen Talent Hub team about your account, mocks, jobs, or payments. We reply here in Messages.'
          : 'Chats from the Naveen Talent Hub team, your mock interviewer, and job groups.'}
        {!helpMode && messageUsage.active
          ? messageUsage.limit < 0
            ? ' Your plan has unlimited replies to team and job chats.'
            : ` Your plan allows ${messageUsage.limit} ${messageUsage.limit === 1 ? 'reply' : 'replies'} per day to team and job chats.`
          : !helpMode
            ? ' An active plan is required to reply to team and job chats.'
            : ''}
        {!helpMode ? ' Mock interviewer chats are always unlimited.' : ''}
      </p>

      <div className="flex min-h-0 flex-1 rounded-xl border border-[rgb(var(--nth-border-light))] bg-white overflow-hidden shadow-sm">
          {/* Left: chat list — hidden on mobile when a chat is open */}
          <aside className={`w-full sm:w-72 shrink-0 flex flex-col border-r border-[rgb(var(--nth-border-light))] bg-[rgb(var(--nth-bg-soft))] ${showListOnMobile ? 'flex' : 'hidden sm:flex'}`}>
            <div className="p-2 bg-white border-b border-[rgb(var(--nth-border-light))]">
              <p className="text-xs font-semibold text-[rgb(var(--nth-text-muted-light))] uppercase tracking-wider px-2 py-1">
                Chats
              </p>
            </div>
            <ul className="flex-1 overflow-auto">
              {chats.map((chat) => {
                const last = chat.lastMessage ?? chat.messages[chat.messages.length - 1];
                const isSelected = selectedChat?.key === chat.key;
                const Icon = chat.icon;
                return (
                  <li key={chat.key}>
                    <button
                      type="button"
                      onClick={() => handleSelectChat(chat.key)}
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
          <main className={`flex-1 flex flex-col min-w-0 bg-[rgb(240,242,245)] ${showListOnMobile ? 'hidden sm:flex' : 'flex'}`}>
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
                <header className="shrink-0 px-3 sm:px-4 py-3 bg-white border-b border-[rgb(var(--nth-border-light))] flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedChatKey(null)}
                    className="sm:hidden p-2.5 -ml-1 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    aria-label="Back to chats"
                  >
                    <HiArrowLeft className="w-5 h-5" />
                  </button>
                  <span className="w-9 h-9 rounded-full bg-[hsl(var(--nth-primary))]/15 flex items-center justify-center shrink-0">
                    {selectedChat.key === NTH_TEAM_KEY ? (
                      <HiChatBubbleLeftRight className="w-5 h-5 text-[hsl(var(--nth-primary))]" />
                    ) : selectedChat.isInterviewerChat ? (
                      <HiAcademicCap className="w-5 h-5 text-[hsl(var(--nth-primary))]" />
                    ) : (
                      <HiUserGroup className="w-5 h-5 text-[hsl(var(--nth-primary))]" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-[rgb(var(--nth-text-primary-light))] truncate text-sm sm:text-base">
                      {selectedChat.label}
                    </h2>
                    <p className="text-[10px] sm:text-xs text-[rgb(var(--nth-text-muted-light))]">
                      {isInterviewerChat
                        ? 'Mock interview chat'
                        : messageUsage.limit >= 0
                          ? `${messageUsage.used} / ${messageUsage.limit} replies today`
                          : 'Replies allowed'}
                    </p>
                  </div>
                </header>

                <div ref={chatScrollRef} className="flex min-h-0 flex-1 flex-col space-y-2 overflow-y-auto overflow-x-hidden p-4">
                  {selectedChat.messages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[rgb(var(--nth-text-muted-light))]">
                      {helpMode || selectedChat.key === NTH_TEAM_KEY
                        ? 'No messages yet. Type below — our team will reply here.'
                        : 'No messages in this chat yet.'}
                    </p>
                  ) : (
                    selectedChat.messages.map((m) => (
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
                  ))
                  )}
                </div>

                {flash && (
                  <div className="shrink-0 px-4 py-2 text-sm text-red-600 bg-red-50">{flash}</div>
                )}

                <form onSubmit={handleSendReply} className="shrink-0 p-2 sm:p-3 bg-white border-t border-[rgb(var(--nth-border-light))]">
                  <div className="flex gap-2 items-end">
                    <textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        canReply
                          ? helpMode
                            ? 'Describe your issue… (Enter to send)'
                            : 'Type a reply... (Enter to send)'
                          : isInterviewerChat
                            ? 'Type a reply... (Enter to send)'
                            : messageUsage.active
                              ? 'Daily limit reached. Try again tomorrow.'
                              : 'Active plan required to reply.'
                      }
                      rows={1}
                      disabled={!canReply || sending}
                      className="flex-1 min-w-0 px-3 py-2 text-sm sm:text-base border border-[rgb(var(--nth-border-light))] rounded-lg bg-white text-[rgb(var(--nth-text-primary-light))] placeholder-[rgb(var(--nth-text-muted-light))] resize-none disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-[hsl(var(--nth-primary))] focus:border-[hsl(var(--nth-primary))]"
                    />
                    <button
                      type="submit"
                      disabled={sending || !replyBody.trim() || !canReply}
                      className="nth-btn-primary px-3 sm:px-4 py-2 text-sm sm:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? '…' : 'Send'}
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
