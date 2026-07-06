export const NTH_TEAM_KEY = '__nth_team__';
export const MOCK_UPDATES_KEY = '__mock_updates__';
export const INTERVIEWER_CHAT_PREFIX = '__interviewer__';

/** Mirror MessagesPage buildChats grouping for mark-as-read + optimistic updates. */
export function getChatKeyForMessage(m) {
  const interviewerKey =
    m.source === 'interviewer' && m.mock_registration_id
      ? `${INTERVIEWER_CHAT_PREFIX}${m.mock_registration_id}`
      : null;
  const mockUpdatesKey =
    m.mock_registration_id && m.source !== 'interviewer' ? MOCK_UPDATES_KEY : null;
  return (
    interviewerKey ??
    mockUpdatesKey ??
    (m.source === 'job_group' && m.job_id ? m.job_id : NTH_TEAM_KEY)
  );
}

export function countUnreadInChat(messages, chatKey) {
  return messages.filter((m) => getChatKeyForMessage(m) === chatKey && !m.from_me && !m.read_at).length;
}

export function countTotalUnread(messages) {
  return messages.filter((m) => !m.from_me && !m.read_at).length;
}

export function markMessagesReadOptimistic(messages, chatKey) {
  const now = new Date().toISOString();
  return messages.map((m) => {
    if (getChatKeyForMessage(m) !== chatKey || m.from_me || m.read_at) return m;
    return { ...m, read_at: now };
  });
}

export async function markChatReadOnServer(supabase, chatKey) {
  if (chatKey === MOCK_UPDATES_KEY) {
    return supabase.rpc('mark_my_mock_notices_read');
  }
  if (chatKey.startsWith(INTERVIEWER_CHAT_PREFIX)) {
    const mockRegistrationId = chatKey.slice(INTERVIEWER_CHAT_PREFIX.length);
    return supabase.rpc('mark_aspirant_messages_read', { p_mock_registration_id: mockRegistrationId });
  }
  const jobId = chatKey === NTH_TEAM_KEY ? null : chatKey;
  return supabase.rpc('mark_aspirant_messages_read', { p_job_id: jobId });
}
