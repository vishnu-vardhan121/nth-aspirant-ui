/**
 * Gemini API key pool helpers (service-role Supabase client).
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type PickedApiKey = {
  id: string;
  api_key: string;
  label: string;
};

export async function pickApiKey(
  admin: SupabaseClient,
): Promise<{ ok: true; key: PickedApiKey } | { ok: false; error: string }> {
  const { data, error } = await admin.rpc("pick_ai_gemini_api_key");
  if (error) {
    return { ok: false, error: error.message };
  }
  const row = data as { ok?: boolean; error?: string; id?: string; api_key?: string; label?: string };
  if (!row?.ok || !row.id || !row.api_key) {
    return { ok: false, error: row?.error || "No active Gemini API keys" };
  }
  return {
    ok: true,
    key: { id: row.id, api_key: row.api_key, label: row.label || "key" },
  };
}

export async function markApiKeyError(
  admin: SupabaseClient,
  keyId: string,
): Promise<void> {
  await admin.rpc("mark_ai_gemini_api_key_error", { p_id: keyId });
}

export async function recordKeyUsage(
  admin: SupabaseClient,
  sessionId: string,
  keyId: string,
): Promise<void> {
  await admin
    .from("ai_practice_sessions")
    .update({ api_key_id: keyId })
    .eq("id", sessionId)
    .eq("status", "in_progress");

  // usage_count / last_used_at — read-modify via RPC-less update
  const { data: keyRow } = await admin
    .from("ai_gemini_api_keys")
    .select("usage_count")
    .eq("id", keyId)
    .maybeSingle();

  const nextCount = Number(keyRow?.usage_count ?? 0) + 1;
  await admin
    .from("ai_gemini_api_keys")
    .update({
      usage_count: nextCount,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", keyId);
}

/**
 * Try creating a token with up to `maxAttempts` different keys.
 */
export async function withApiKeyRetry<T>(
  admin: SupabaseClient,
  maxAttempts: number,
  fn: (key: PickedApiKey) => Promise<T>,
): Promise<{ result: T; key: PickedApiKey }> {
  let lastError = "No active Gemini API keys";

  for (let i = 0; i < maxAttempts; i++) {
    const picked = await pickApiKey(admin);
    if (!picked.ok) {
      throw new Error(picked.error);
    }

    try {
      const result = await fn(picked.key);
      return { result, key: picked.key };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      await markApiKeyError(admin, picked.key.id);
    }
  }

  throw new Error(lastError);
}
