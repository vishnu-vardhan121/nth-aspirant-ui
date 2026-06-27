/**
 * User-facing messages for Supabase Edge Function invoke() failures.
 */

const SESSION_EXPIRED = 'Session expired. Please sign out and sign in again.';

/** @param {string | null | undefined} message */
export function normalizeEdgeFunctionErrorMessage(message, fallback = 'Something went wrong.') {
  const m = String(message ?? '').trim();
  if (!m) return fallback;
  if (m === 'Invalid JWT' || /jwt expired/i.test(m)) return SESSION_EXPIRED;
  if (m === 'Failed to fetch' || /network/i.test(m)) {
    return 'Network error. Check your connection and try again.';
  }
  return m;
}

/**
 * Prefer JSON body error from edge function, then client transport error.
 * @param {{ error?: { message?: string } | null, data?: { error?: unknown } | null, fallback?: string }} opts
 */
export function getEdgeFunctionErrorMessage({ error, data, fallback = 'Request failed.' }) {
  const serverError = data?.error != null ? String(data.error) : null;
  const clientError = error?.message ? String(error.message) : null;
  return normalizeEdgeFunctionErrorMessage(serverError || clientError, fallback);
}
