import { useCallback, useEffect, useRef, useState } from 'react';
import { HiCheck } from 'react-icons/hi2';
import { formatHelpDeskTime, fetchHelpRequestThread, sendHelpRequestReply } from '../../lib/helpDesk';

export default function HelpDeskConversation({
  requestId,
  viewerRole = 'user',
  disabled = false,
  onThreadLoaded,
}) {
  const [messages, setMessages] = useState([]);
  const [request, setRequest] = useState(null);
  const [canReply, setCanReply] = useState(true);
  const [replyDisabledReason, setReplyDisabledReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);
  const onThreadLoadedRef = useRef(onThreadLoaded);
  const threadNotifiedRef = useRef(null);

  useEffect(() => {
    onThreadLoadedRef.current = onThreadLoaded;
  }, [onThreadLoaded]);

  useEffect(() => {
    threadNotifiedRef.current = null;
  }, [requestId]);

  const loadThread = useCallback(async () => {
    if (!requestId) {
      setMessages([]);
      setRequest(null);
      setCanReply(true);
      setReplyDisabledReason('');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: rpcError } = await fetchHelpRequestThread(requestId);
    setLoading(false);
    if (rpcError || !data?.ok) {
      setError(data?.error || rpcError?.message || 'Could not load conversation.');
      return;
    }
    setRequest(data.request ?? null);
    setMessages(Array.isArray(data.messages) ? data.messages : []);
    setCanReply(data.can_reply !== false);
    setReplyDisabledReason(data.reply_disabled_reason || '');
    if (threadNotifiedRef.current !== requestId) {
      threadNotifiedRef.current = requestId;
      onThreadLoadedRef.current?.(data.request ?? null, data);
    }
  }, [requestId]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    const body = replyBody.trim();
    if (!body || !requestId || sending || disabled || !canReply) return;
    setSending(true);
    setError('');
    const { data, error: rpcError } = await sendHelpRequestReply(requestId, body);
    setSending(false);
    if (rpcError || !data?.ok) {
      setError(data?.error || rpcError?.message || 'Failed to send reply.');
      return;
    }
    setReplyBody('');
    await loadThread();
  };

  if (!requestId) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center p-6 text-sm text-slate-500">
        Select a ticket to view the conversation.
      </div>
    );
  }

  if (loading && !messages.length) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center p-6 text-sm text-slate-500">
        Loading conversation…
      </div>
    );
  }

  const replyLocked = disabled || !canReply;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="nth-scroll-y min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No messages yet.</p>
        ) : (
          messages.map((m) => {
            const fromMe = Boolean(m.from_me);
            const isAdminBubble = viewerRole === 'admin' ? m.sender_role === 'admin' : fromMe;
            return (
              <div key={m.id} className={isAdminBubble ? 'flex justify-end' : 'flex justify-start'}>
                <div className="max-w-[85%] sm:max-w-[75%]">
                  <p className={`mb-1 text-[10px] font-medium uppercase tracking-wide ${isAdminBubble ? 'text-right text-slate-400' : 'text-slate-500'}`}>
                    {m.sender_role === 'admin' ? 'Support team' : viewerRole === 'admin' ? 'User' : 'You'}
                  </p>
                  <div
                    className={
                      isAdminBubble
                        ? 'rounded-lg rounded-tr-none bg-indigo-600 px-3 py-2.5 text-white shadow-sm'
                        : 'rounded-lg rounded-tl-none border border-slate-200 bg-white px-3 py-2.5 text-slate-800 shadow-sm'
                    }
                  >
                    <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                    <div className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${isAdminBubble ? 'text-white/80' : 'text-slate-400'}`}>
                      <span>{formatHelpDeskTime(m.created_at)}</span>
                      {fromMe ? <HiCheck className="h-3.5 w-3.5 opacity-80" aria-hidden /> : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error ? <p className="shrink-0 border-t border-red-100 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p> : null}

      {replyLocked && replyDisabledReason ? (
        <p className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600">{replyDisabledReason}</p>
      ) : null}

      {replyLocked ? null : (
        <form onSubmit={handleSend} className="shrink-0 border-t border-slate-200 bg-white p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              rows={2}
              disabled={sending}
              placeholder={viewerRole === 'admin' ? 'Reply to the user…' : 'Type your reply…'}
              className="min-h-[44px] flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending || !replyBody.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? '…' : 'Send'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
