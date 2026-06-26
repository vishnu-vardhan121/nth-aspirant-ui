import { supabase } from './supabase';

/** @param {string} uid @param {() => void} onChange @returns {() => void} */
export function subscribeToAspirantProfile(uid, onChange) {
  if (!uid || typeof supabase.channel !== 'function') return () => {};

  const uidStr = String(uid);
  const ch = supabase.channel(`aspirant-profile-${uidStr}`);

  ch.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'aspirants',
      filter: `id=eq.${uidStr}`,
    },
    () => {
      onChange();
    },
  ).subscribe((status) => {
    if (status === 'CHANNEL_ERROR') {
      console.warn(
        '[Realtime] aspirants channel error – run migration 085 and enable Replication for aspirants.',
      );
    }
  });

  return () => {
    supabase.removeChannel(ch);
  };
}
