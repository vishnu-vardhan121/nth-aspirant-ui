/**
 * Edge Function: ai-practice-start
 *
 * Paid aspirant with an in_progress session → pick Gemini API key from DB pool
 * → create constrained Live API ephemeral token → return token + WS config.
 *
 * Deploy: npx supabase functions deploy ai-practice-start
 * Body: { session_id: uuid }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withApiKeyRetry, recordKeyUsage } from "../_shared/ai-practice/apiKeyPool.ts";
import {
  createConstrainedLiveToken,
  getLiveWsConfig,
  LIVE_API_MODEL_ID,
} from "../_shared/ai-practice/gemini.ts";
import {
  corsHeaders,
  getCallerIdFromJwt,
  jsonResponse,
} from "../_shared/ai-practice/http.ts";
import { buildLivePrompt } from "../_shared/ai-practice/prompts.ts";
import { getSessionTiming, isValidLevel, isValidTrack } from "../_shared/ai-practice/tracks.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ ok: false, error: "Server misconfigured" }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const callerId = getCallerIdFromJwt(req);
    if (!callerId) {
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }

    let body: { session_id?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const sessionId = String(body.session_id || "").trim();
    if (!sessionId) {
      return jsonResponse({ ok: false, error: "session_id is required" }, 400);
    }

    const { data: session, error: sessionError } = await admin
      .from("ai_practice_sessions")
      .select("id, aspirant_id, track, level, status")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) {
      return jsonResponse({ ok: false, error: sessionError.message }, 500);
    }
    if (!session) {
      return jsonResponse({ ok: false, error: "Session not found" }, 404);
    }
    if (session.aspirant_id !== callerId) {
      return jsonResponse({ ok: false, error: "Forbidden" }, 403);
    }
    if (session.status !== "in_progress") {
      return jsonResponse(
        { ok: false, error: "Session is not in progress" },
        400,
      );
    }

    const track = String(session.track || "").toLowerCase();
    const level = Number(session.level);
    if (!isValidTrack(track) || !isValidLevel(level)) {
      return jsonResponse({ ok: false, error: "Invalid track or level on session" }, 400);
    }

    // Soft check: aspirant still has active plan (start RPC already enforced; re-check here)
    const { data: aspirant } = await admin
      .from("aspirants")
      .select("plan, plan_started_at")
      .eq("id", callerId)
      .maybeSingle();

    if (!aspirant?.plan) {
      return jsonResponse({ ok: false, error: "Aspirant profile not found" }, 403);
    }

    const { data: active, error: activeError } = await admin.rpc(
      "is_subscription_active",
      {
        plan_name: aspirant.plan,
        started_at: aspirant.plan_started_at,
      },
    );

    // Only block when the helper explicitly returns false (ignore RPC errors — start RPC already gated).
    if (!activeError && active === false) {
      return jsonResponse(
        { ok: false, error: "Active subscription required for AI Practice" },
        403,
      );
    }

    const systemInstruction = buildLivePrompt(track, level);
    const timing = getSessionTiming(level);

    let tokenResult;
    let usedKey;
    try {
      const out = await withApiKeyRetry(admin, 3, async (key) => {
        return await createConstrainedLiveToken({
          apiKey: key.api_key,
          systemInstruction,
          voiceName: "Aoede",
          // Match HirecruitAI gemini.service.js — token fetched at WS connect time.
          uses: 2,
          expireMinutes: Math.max(20, timing.maxMinutes + 10),
          newSessionExpireMinutes: 2,
        });
      });
      tokenResult = out.result;
      usedKey = out.key;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = /no active gemini/i.test(message) ? 503 : 502;
      return jsonResponse({ ok: false, error: message }, status);
    }

    await recordKeyUsage(admin, sessionId, usedKey.id);

    return jsonResponse({
      ok: true,
      session_id: sessionId,
      track,
      level,
      token: tokenResult.name,
      expires_at: tokenResult.expireTime,
      new_session_expires_at: tokenResult.newSessionExpireTime,
      model: tokenResult.model || LIVE_API_MODEL_ID,
      config: getLiveWsConfig(tokenResult.model || LIVE_API_MODEL_ID),
      timing: {
        min_minutes: timing.minMinutes,
        target_minutes: timing.targetMinutes,
        max_minutes: timing.maxMinutes,
      },
    });
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e) }, 500);
  }
});
