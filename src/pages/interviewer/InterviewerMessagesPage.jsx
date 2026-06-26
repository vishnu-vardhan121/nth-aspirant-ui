import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { PageLoader } from '../../components/ui/Loader';
import { subscribeToInterviewerMessages } from '../../lib/messageRealtime';
import { HiAcademicCap, HiArrowLeft, HiChatBubbleLeftRight } from 'react-icons/hi2';

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

function formatSlot(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function lastPreview(body, maxLen = 40) {
  if (!body) return 'No messages yet';
  const t = body.replace(/\n/g, ' ').trim();
  return t.length <= maxLen ? t : `${t.slice(0, maxLen)}…`;
}

export default function InterviewerMessagesPage() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [flash, setFlash] = useState('');
  const chatScrollRef = useRef(null);

  const selectedThread = threads.find((t) => t.mock_registration_id === selectedId) ?? null;

  const loadThreads = () => {
    supabase.rpc('get_interviewer_message_threads').then(({ data }) => {
      setThreads(Array.isArray(data) ? data : []);
    });
  };

  const loadMessages = (mockRegistrationId) => {
    if (!mockRegistrationId) {
      setMessages([]);
      return;
    }
    supabase.rpc('get_interviewer_messages', { p_mock_registration_id: mockRegistrationId }).then(({ data }) => {
      setMessages(Array.isArray(data) ? data : []);
    });
  };

  useEffect(() => {
    supabase.rpc('get_interviewer_message_threads').then(({ data }) => {
      setThreads(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      const uid = session?.user?.id;
      if (!uid) return;

      unsubscribe = subscribeToInterviewerMessages(uid, () => {
        loadThreads();
        if (selectedId) loadMessages(selectedId);
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    loadMessages(selectedId);
    supabase.rpc('mark_interviewer_messages_read', { p_mock_registration_id: selectedId }).then(() => loadThreads());
  }, [selectedId]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [selectedId, messages.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    const body = replyBody.trim();
    if (!body || sending || !selectedId) return;
    setSending(true);
    const { data } = await supabase.rpc('send_interviewer_message', {
      p_mock_registration_id: selectedId,
      p_body: body,
    });
    setSending(false);
    if (data?.ok) {
      setReplyBody('');
      setFlash('');
      loadMessages(selectedId);
      loadThreads();
    } else {
      setFlash(data?.error || 'Failed to send');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const showListOnMobile = !selectedId;

  if (loading) return <PageLoader size="md" label="Loading messages…" className="py-8" />;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[400px]">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Messages</h1>
      <p className="text-sm text-slate-600 mb-4">
        Chat with aspirants about their mock interviews.
      </p>

      {threads.length === 0 ? (
        <div className="flex-1 rounded-xl border border-slate-200 bg-white flex items-center justify-center p-8 text-slate-500">
          No mock bookings yet. Messages appear when you have scheduled mocks.
        </div>
      ) : (
        <div className="flex-1 flex min-h-0 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <aside
            className={`w-full sm:w-72 shrink-0 flex flex-col border-r border-slate-200 bg-slate-50 ${
              showListOnMobile ? 'flex' : 'hidden sm:flex'
            }`}
          >
            <div className="p-2 bg-white border-b border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-1">
                Mock chats
              </p>
            </div>
            <ul className="flex-1 overflow-auto">
              {threads.map((thread) => {
                const isSelected = selectedId === thread.mock_registration_id;
                return (
                  <li key={thread.mock_registration_id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(thread.mock_registration_id)}
                      className={`w-full text-left px-3 py-3 flex items-start gap-3 hover:bg-white/80 transition-colors border-b border-slate-200/60 ${
                        isSelected ? 'bg-white border-l-2 border-l-indigo-600' : ''
                      }`}
                    >
                      <span className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <HiAcademicCap className="w-5 h-5 text-indigo-600" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate flex items-center gap-2">
                          {thread.aspirant_name || thread.aspirant_email || 'Aspirant'}
                          {thread.unread_count > 0 && (
                            <span className="bg-indigo-600 text-white text-xs font-semibold min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center">
                              {thread.unread_count > 99 ? '99+' : thread.unread_count}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {lastPreview(thread.last_body)}
                        </p>
                        {thread.scheduled_at && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Mock: {formatSlot(thread.scheduled_at)}
                          </p>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatChatTime(thread.last_at)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <main className={`flex-1 flex flex-col min-w-0 bg-slate-100 ${showListOnMobile ? 'hidden sm:flex' : 'flex'}`}>
            {!selectedThread ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center text-slate-500">
                  <HiChatBubbleLeftRight className="w-14 h-14 mx-auto mb-3 opacity-40" />
                  <p className="font-medium text-slate-800">Select a conversation</p>
                  <p className="text-sm mt-1">Choose an aspirant to view messages</p>
                </div>
              </div>
            ) : (
              <>
                <header className="shrink-0 px-3 sm:px-4 py-3 bg-white border-b border-slate-200 flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="sm:hidden p-1.5 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100"
                    aria-label="Back to chats"
                  >
                    <HiArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-slate-900 truncate text-sm sm:text-base">
                      {selectedThread.aspirant_name || selectedThread.aspirant_email}
                    </h2>
                    <p className="text-[10px] sm:text-xs text-slate-500 capitalize">
                      {selectedThread.status}
                      {selectedThread.scheduled_at ? ` · ${formatSlot(selectedThread.scheduled_at)}` : ''}
                    </p>
                  </div>
                </header>

                <div ref={chatScrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2 flex flex-col">
                  {messages.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">No messages yet. Say hello before the mock.</p>
                  ) : (
                    messages.map((m) => (
                      <div key={m.id} className={m.from_me ? 'flex justify-end' : 'flex justify-start'}>
                        <div
                          className={
                            m.from_me
                              ? 'max-w-[85%] rounded-lg rounded-tr-none bg-indigo-600 text-white shadow-sm px-3 py-2.5'
                              : 'max-w-[85%] rounded-lg rounded-tl-none bg-white shadow-sm border border-slate-200/60 px-3 py-2.5'
                          }
                        >
                          <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                          <p className={`text-[10px] mt-1.5 text-right ${m.from_me ? 'text-white/80' : 'text-slate-400'}`}>
                            {formatTime(m.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {flash && <div className="shrink-0 px-4 py-2 text-sm text-red-600 bg-red-50">{flash}</div>}

                <form onSubmit={handleSend} className="shrink-0 p-2 sm:p-3 bg-white border-t border-slate-200">
                  <div className="flex gap-2 items-end">
                    <textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message… (Enter to send)"
                      rows={1}
                      disabled={sending}
                      className="flex-1 min-w-0 px-3 py-2 text-sm border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={sending || !replyBody.trim()}
                      className="nth-btn-primary px-3 sm:px-4 py-2 text-sm font-medium disabled:opacity-50"
                    >
                      {sending ? '…' : 'Send'}
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
