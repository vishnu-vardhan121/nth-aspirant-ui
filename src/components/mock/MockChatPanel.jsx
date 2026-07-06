import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { subscribeToInterviewerMessages } from '../../lib/messageRealtime';
import { HiArrowLeft } from 'react-icons/hi2';
import ViewCandidateProfileButton from '../interviewer/ViewCandidateProfileButton';

function formatTime(createdAt) {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatSlot(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function MockChatPanel({
  mockRegistrationId,
  aspirantName,
  aspirantEmail,
  scheduledAt,
  status,
  showHeader = true,
  onBack,
  className = '',
  onMarkedRead,
}) {
  const [messages, setMessages] = useState([]);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [flash, setFlash] = useState('');
  const chatScrollRef = useRef(null);

  const loadMessages = () => {
    if (!mockRegistrationId) {
      setMessages([]);
      return;
    }
    supabase.rpc('get_interviewer_messages', { p_mock_registration_id: mockRegistrationId }).then(({ data }) => {
      setMessages(Array.isArray(data) ? data : []);
    });
  };

  useEffect(() => {
    if (!mockRegistrationId) return undefined;

    loadMessages();
    supabase
      .rpc('mark_interviewer_messages_read', { p_mock_registration_id: mockRegistrationId })
      .then(() => onMarkedRead?.());

    let cancelled = false;
    let unsubscribe = () => {};

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      const uid = session?.user?.id;
      if (!uid) return;

      unsubscribe = subscribeToInterviewerMessages(uid, loadMessages);
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [mockRegistrationId]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [mockRegistrationId, messages.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    const body = replyBody.trim();
    if (!body || sending || !mockRegistrationId) return;
    setSending(true);
    const { data } = await supabase.rpc('send_interviewer_message', {
      p_mock_registration_id: mockRegistrationId,
      p_body: body,
    });
    setSending(false);
    if (data?.ok) {
      setReplyBody('');
      setFlash('');
      loadMessages();
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

  const displayName = aspirantName || aspirantEmail || 'Aspirant';

  return (
    <div className={`flex min-h-0 flex-1 flex-col bg-slate-100 ${className}`}>
      {showHeader && (
        <header className="shrink-0 flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-3 sm:gap-3 sm:px-4">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="-ml-1 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 sm:hidden"
              aria-label="Back to chats"
            >
              <HiArrowLeft className="h-5 w-5" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-slate-900 sm:text-base">{displayName}</h2>
            <p className="text-[10px] capitalize text-slate-500 sm:text-xs">
              {status || 'mock'}
              {scheduledAt ? ` · ${formatSlot(scheduledAt)}` : ''}
            </p>
          </div>
          <ViewCandidateProfileButton mockRegistrationId={mockRegistrationId} label="Profile" />
        </header>
      )}

      <div ref={chatScrollRef} className="flex min-h-0 flex-1 flex-col space-y-2 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No messages yet. Say hello before the mock.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={m.from_me ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={
                  m.from_me
                    ? 'max-w-[85%] rounded-lg rounded-tr-none bg-indigo-600 px-3 py-2.5 text-white shadow-sm'
                    : 'max-w-[85%] rounded-lg rounded-tl-none border border-slate-200/60 bg-white px-3 py-2.5 shadow-sm'
                }
              >
                <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                <p className={`mt-1.5 text-right text-[10px] ${m.from_me ? 'text-white/80' : 'text-slate-400'}`}>
                  {formatTime(m.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {flash && <div className="shrink-0 bg-red-50 px-4 py-2 text-sm text-red-600">{flash}</div>}

      <form onSubmit={handleSend} className="shrink-0 border-t border-slate-200 bg-white p-2 sm:p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            rows={1}
            disabled={sending}
            className="min-w-0 flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={sending || !replyBody.trim()}
            className="nth-btn-primary px-3 py-2 text-sm font-medium disabled:opacity-50 sm:px-4"
          >
            {sending ? '…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
