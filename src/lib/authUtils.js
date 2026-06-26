/**
 * Auth helpers: email verification (Supabase user.email_confirmed_at) and safe return paths.
 */

/** @param {import('@supabase/supabase-js').User | null} user */
export function isEmailVerified(user) {
  return !!user?.email_confirmed_at;
}

/** Redirect URL for signup confirmation emails (add to Supabase Auth redirect URLs). */
export function getEmailConfirmRedirectUrl() {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/auth/confirm`;
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

/**
 * Post-login route by role. Aspirants go to dashboard first; onboarding runs after payment approval.
 */
export function getPostLoginPathForRole(role) {
  if (role === 'aspirant') return '/dashboard';
  if (role === 'admin') return '/admin';
  if (role === 'interviewer') return '/interviewer';
  return '/dashboard';
}

/** True when the URL looks like a Supabase email-confirmation callback. */
export function hasEmailConfirmationCallback() {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  if (hash.includes('type=signup') || hash.includes('type=email')) return true;
  if (search.includes('type=signup') || search.includes('type=email')) return true;
  return false;
}

const UNCONFIRMED_EMAIL_PATTERNS = [
  'email not confirmed',
  'email not verified',
  'confirm your email',
];

/** @param {string} message */
export function isUnconfirmedEmailError(message) {
  const m = String(message || '').toLowerCase();
  return UNCONFIRMED_EMAIL_PATTERNS.some((p) => m.includes(p));
}

export const MIN_PASSWORD_LENGTH = 8;

/** @returns {string | null} Error message, or null if valid */
export function validateNewPasswordPair(password, confirmPassword) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match.';
  }
  return null;
}

export const DASHBOARD_JOBS_PATH = '/dashboard/jobs';
export const DASHBOARD_PATH = '/dashboard';

/** @param {string | null | undefined} applyLink */
export function isExternalApplyLink(applyLink) {
  const trimmed = String(applyLink ?? '').trim();
  return /^https?:\/\//i.test(trimmed);
}

/** @param {string | null | undefined} applyLink */
export function getExternalApplyHref(applyLink) {
  return String(applyLink).trim();
}

/** @param {boolean} isAuthenticated */
export function getDashboardJobsAuthPath(isAuthenticated) {
  return isAuthenticated
    ? DASHBOARD_JOBS_PATH
    : `/login?from=${encodeURIComponent(DASHBOARD_JOBS_PATH)}`;
}

/** @param {boolean} isAuthenticated */
export function getDashboardAuthPath(isAuthenticated) {
  return isAuthenticated
    ? DASHBOARD_PATH
    : `/login?from=${encodeURIComponent(DASHBOARD_PATH)}`;
}
