import { supabase } from './supabase';

export const PLAN_ACTIVATED_SUBJECT = 'Plan activated';

const CELEBRATION_PREFIX = 'nth-plan-celebrated:';

export function celebrationStorageKey(userId, token) {
  return `${CELEBRATION_PREFIX}${userId}:${token}`;
}

export function hasShownCelebration(userId, token) {
  if (!userId || !token) return true;
  try {
    return localStorage.getItem(celebrationStorageKey(userId, token)) === '1';
  } catch {
    return false;
  }
}

export function markCelebrationShown(userId, token) {
  if (!userId || !token) return;
  try {
    localStorage.setItem(celebrationStorageKey(userId, token), '1');
  } catch {
    /* ignore */
  }
}

export function celebrationTokenForOrder(orderId) {
  return `order:${orderId}`;
}

export function celebrationTokenForProfile(plan, planStartedAt) {
  return `profile:${plan}:${planStartedAt}`;
}

export function isPlanActivationMessage(row) {
  if (!row || row.from_aspirant_id) return false;
  const subject = (row.subject || '').trim().toLowerCase();
  return subject === PLAN_ACTIVATED_SUBJECT.toLowerCase();
}

/**
 * Realtime: payment order approved for this aspirant.
 * @returns {() => void}
 */
export function subscribeToPaymentApproval(uid, onApproved) {
  if (!uid || typeof supabase.channel !== 'function') return () => {};

  const uidStr = String(uid);
  const ch = supabase.channel(`payment-approval-${uidStr}`);

  ch.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'payment_orders',
      filter: `aspirant_id=eq.${uidStr}`,
    },
    (payload) => {
      const next = payload?.new;
      const prev = payload?.old;
      if (next?.status !== 'approved') return;
      if (prev?.status === 'approved') return;
      onApproved(next);
    },
  ).subscribe((status) => {
    if (status === 'CHANNEL_ERROR') {
      console.warn(
        '[Realtime] payment_orders channel error – run migrations 083/085 and enable Replication.',
      );
    }
  });

  return () => {
    supabase.removeChannel(ch);
  };
}

/** Latest approved order not yet celebrated (e.g. user was offline). */
export async function fetchUncelebratedApproval(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('payment_orders')
    .select('id, plan, status, reviewed_at')
    .eq('aspirant_id', userId)
    .eq('status', 'approved')
    .order('reviewed_at', { ascending: false })
    .limit(5);

  if (error || !Array.isArray(data)) return null;

  const row = data.find(
    (r) => r.id && !hasShownCelebration(userId, celebrationTokenForOrder(r.id)),
  );
  return row ?? null;
}
