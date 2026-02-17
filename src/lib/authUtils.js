/**
 * Auth helpers: email verification (Supabase user.email_confirmed_at) and safe return paths.
 */

/** @param {import('@supabase/supabase-js').User | null} user */
export function isEmailVerified(user) {
  return !!user?.email_confirmed_at;
}

/**
 * Safe return path from query: same-origin path only.
 * @param {URLSearchParams} searchParams
 * @param {string} [defaultPath='/']
 */
export function getSafeReturnPath(searchParams, defaultPath = '/') {
  const from = searchParams.get('from') || defaultPath;
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) {
    return defaultPath;
  }
  return from;
}
