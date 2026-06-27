import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PageLoader } from '../../components/ui/Loader';
import MockChatPanel from '../../components/mock/MockChatPanel';
import { subscribeToInterviewerMessages } from '../../lib/messageRealtime';
import { HiAcademicCap, HiChatBubbleLeftRight } from 'react-icons/hi2';

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

  const selectedThread = threads.find((t) => t.mock_registration_id === selectedId) ?? null;

  const loadThreads = () => {
    supabase.rpc('get_interviewer_message_threads').then(({ data }) => {
      setThreads(Array.isArray(data) ? data : []);
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      const uid = session?.user?.id;
      if (!uid) return;

      unsubscribe = subscribeToInterviewerMessages(uid, loadThreads);
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const showListOnMobile = !selectedId;

  if (loading) return <PageLoader size="md" label="Loading messages…" className="py-8" />;

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[400px] flex-col">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Messages</h1>
      <p className="mb-4 text-sm text-slate-600">Chat with aspirants about their mock interviews.</p>

      {threads.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-slate-500">
          No mock bookings yet. Messages appear when you have scheduled mocks.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <aside
            className={`flex w-full shrink-0 flex-col border-r border-slate-200 bg-slate-50 sm:w-72 ${
              showListOnMobile ? 'flex' : 'hidden sm:flex'
            }`}
          >
            <div className="border-b border-slate-200 bg-white p-2">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Mock chats</p>
            </div>
            <ul className="flex-1 overflow-auto">
              {threads.map((thread) => {
                const isSelected = selectedId === thread.mock_registration_id;
                return (
                  <li key={thread.mock_registration_id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(thread.mock_registration_id)}
                      className={`flex w-full items-start gap-3 border-b border-slate-200/60 px-3 py-3 text-left transition-colors hover:bg-white/80 ${
                        isSelected ? 'border-l-2 border-l-indigo-600 bg-white' : ''
                      }`}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                        <HiAcademicCap className="h-5 w-5 text-indigo-600" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 truncate font-medium text-slate-900">
                          {thread.aspirant_name || thread.aspirant_email || 'Aspirant'}
                          {thread.unread_count > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-semibold text-white">
                              {thread.unread_count > 99 ? '99+' : thread.unread_count}
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{lastPreview(thread.last_body)}</p>
                        {thread.scheduled_at && (
                          <p className="mt-0.5 text-[10px] text-slate-400">Mock: {formatSlot(thread.scheduled_at)}</p>
                        )}
                      </span>
                      <span className="shrink-0 text-[10px] text-slate-400">{formatChatTime(thread.last_at)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <main className={`min-w-0 flex-1 flex-col bg-slate-100 ${showListOnMobile ? 'hidden sm:flex' : 'flex'}`}>
            {!selectedThread ? (
              <div className="flex flex-1 items-center justify-center p-8">
                <div className="text-center text-slate-500">
                  <HiChatBubbleLeftRight className="mx-auto mb-3 h-14 w-14 opacity-40" />
                  <p className="font-medium text-slate-800">Select a conversation</p>
                  <p className="mt-1 text-sm">Choose an aspirant to view messages</p>
                </div>
              </div>
            ) : (
              <MockChatPanel
                mockRegistrationId={selectedThread.mock_registration_id}
                aspirantName={selectedThread.aspirant_name}
                aspirantEmail={selectedThread.aspirant_email}
                scheduledAt={selectedThread.scheduled_at}
                status={selectedThread.status}
                onBack={() => setSelectedId(null)}
              />
            )}
          </main>
        </div>
      )}
    </div>
  );
}
