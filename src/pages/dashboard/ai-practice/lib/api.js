import { supabase } from '../../../../lib/supabase';

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  let token = data?.session?.access_token;
  if (!token) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    token = refreshed?.session?.access_token;
  }
  return token || null;
}

/**
 * Start live token for an in_progress session.
 */
export async function fetchPracticeToken(sessionId) {
  const token = await getAccessToken();
  if (!token) {
    return { ok: false, error: 'Session expired. Please sign in again.' };
  }

  const { data, error } = await supabase.functions.invoke('ai-practice-start', {
    body: { session_id: sessionId },
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error || !data?.ok) {
    return {
      ok: false,
      error: data?.error || error?.message || 'Failed to start AI Practice session',
    };
  }

  return {
    ok: true,
    token: data.token,
    model: data.model,
    wsEndpoint: data.config?.wsEndpoint,
    timing: data.timing,
    track: data.track,
    level: data.level,
  };
}

/**
 * Evaluate saved transcript for a session in evaluating status.
 */
export async function evaluatePracticeSession(sessionId) {
  const token = await getAccessToken();
  if (!token) {
    return { ok: false, error: 'Session expired. Please sign in again.' };
  }

  const { data, error } = await supabase.functions.invoke('ai-practice-evaluate', {
    body: { session_id: sessionId },
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error || !data?.ok) {
    return {
      ok: false,
      error: data?.error || error?.message || 'Failed to evaluate session',
    };
  }

  return {
    ok: true,
    overall_percent: data.overall_percent,
    passed: data.passed,
    areas: data.areas || [],
    unlocked_level: data.unlocked_level ?? null,
    track_completed: Boolean(data.track_completed),
  };
}
