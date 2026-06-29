import { supabase } from './supabase';

/** True when this INSERT is an incoming message for the aspirant (not their own reply). */
export function isIncomingAspirantMessage(row, uidStr) {
  if (!row || !uidStr) return false;
  const rowTo = row.to_aspirant_id != null ? String(row.to_aspirant_id) : null;
  const rowFrom = row.from_aspirant_id != null ? String(row.from_aspirant_id) : null;
  if (rowFrom === uidStr) return false;
  const toMe = rowTo === uidStr;
  const isBroadcast = row.to_aspirant_id == null && row.from_admin_id != null;
  const fromInterviewer = rowTo === uidStr && row.from_interviewer_id != null;
  return toMe || isBroadcast || fromInterviewer;
}

/**
 * Subscribe to new messages for an aspirant (personal + platform broadcast).
 * @param {string} uid
 * @param {(row: object) => void} onInsert
 * @param {{ channelId?: string }} [options]
 * @returns {() => void} cleanup
 */
export function subscribeToAspirantMessages(uid, onInsert, options = {}) {
  if (!uid || typeof supabase.channel !== 'function') return () => {};

  const uidStr = String(uid);
  const channelName = options.channelId ?? `aspirant-messages-${uidStr}`;
  const ch = supabase.channel(channelName);

  const handler = (payload) => {
    const row = payload?.new;
    if (!row || !isIncomingAspirantMessage(row, uidStr)) return;
    onInsert(row);
  };

  ch.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    handler,
  ).subscribe((status) => {
    if (status === 'CHANNEL_ERROR') {
      console.warn(
        '[Realtime] messages channel error – enable Replication for table "messages" in Supabase.',
      );
    }
  });

  return () => {
    supabase.removeChannel(ch);
  };
}

/**
 * Subscribe to aspirant replies in mock threads for an interviewer.
 * @param {string} uid interviewer user id
 * @param {() => void} onInsert
 * @returns {() => void} cleanup
 */
export function subscribeToInterviewerMessages(uid, onInsert) {
  if (!uid || typeof supabase.channel !== 'function') return () => {};

  const uidStr = String(uid);
  const ch = supabase.channel(`interviewer-messages-${uidStr}`);

  ch.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    () => onInsert(),
  ).subscribe();

  return () => {
    supabase.removeChannel(ch);
  };
}

/**
 * Subscribe to new messages for admin inbox refresh (RLS-scoped).
 * @param {() => void} onInsert
 * @param {{ channelId?: string }} [options]
 * @returns {() => void} cleanup
 */
export function subscribeToAdminMessages(onInsert, options = {}) {
  if (typeof supabase.channel !== 'function') return () => {};

  const channelName = options.channelId ?? 'admin-messages';
  const ch = supabase.channel(channelName);

  ch.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    () => onInsert(),
  ).subscribe((status) => {
    if (status === 'CHANNEL_ERROR') {
      console.warn(
        '[Realtime] admin messages channel error – enable Replication for table "messages" in Supabase.',
      );
    }
  });

  return () => {
    supabase.removeChannel(ch);
  };
}
