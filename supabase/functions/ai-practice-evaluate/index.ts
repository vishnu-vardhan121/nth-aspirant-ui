/**
 * Edge Function: ai-practice-evaluate
 *
 * After voice session ends and transcript is saved (status=evaluating):
 * pick Gemini key → score rubric via text model → save_ai_practice_evaluation (≥70% unlock).
 *
 * Deploy: npx supabase functions deploy ai-practice-evaluate
 * Body: { session_id: uuid }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withApiKeyRetry, markApiKeyError } from "../_shared/ai-practice/apiKeyPool.ts";
import {
  evaluateTranscriptWithGemini,
} from "../_shared/ai-practice/gemini.ts";
import {
  corsHeaders,
  getCallerIdFromJwt,
  jsonResponse,
} from "../_shared/ai-practice/http.ts";
import { buildEvaluationPrompt } from "../_shared/ai-practice/prompts.ts";
import { getRubricAreas } from "../_shared/ai-practice/rubrics.ts";
import { isValidLevel, isValidTrack } from "../_shared/ai-practice/tracks.ts";

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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ ok: false, error: "Server misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const callerId = getCallerIdFromJwt(req);
    if (!callerId) {
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // User-scoped client so save_ai_practice_evaluation sees auth.uid()
    const userClient = anonKey
      ? createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      : null;

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
      .select(
        "id, aspirant_id, track, level, status, transcript, duration_seconds",
      )
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
    if (session.status !== "evaluating") {
      return jsonResponse(
        {
          ok: false,
          error:
            session.status === "completed"
              ? "Session already evaluated"
              : "Session must be in evaluating status (save transcript first)",
        },
        400,
      );
    }

    const track = String(session.track || "").toLowerCase();
    const level = Number(session.level);
    if (!isValidTrack(track) || !isValidLevel(level)) {
      return jsonResponse({ ok: false, error: "Invalid track or level on session" }, 400);
    }

    const transcript = String(session.transcript || "").trim();
    const expectedAreas = getRubricAreas(track, level);
    const prompt = buildEvaluationPrompt(track, level, transcript);

    let evaluation;
    let usedKeyId: string | null = null;
    try {
      const out = await withApiKeyRetry(admin, 3, async (key) => {
        usedKeyId = key.id;
        return await evaluateTranscriptWithGemini({
          apiKey: key.api_key,
          prompt,
          expectedAreas,
        });
      });
      evaluation = out.result;
      usedKeyId = out.key.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (usedKeyId) await markApiKeyError(admin, usedKeyId);
      const status = /no active gemini/i.test(message) ? 503 : 502;
      return jsonResponse({ ok: false, error: message }, status);
    }

    // Persist via RPC (auth.uid = aspirant)
    let saveResult: Record<string, unknown> | null = null;
    if (userClient) {
      const { data, error } = await userClient.rpc("save_ai_practice_evaluation", {
        p_session_id: sessionId,
        p_overall_percent: evaluation.overall_percent,
        p_passed: evaluation.passed,
        p_area_scores: evaluation.areas,
      });
      if (error) {
        return jsonResponse({ ok: false, error: error.message }, 500);
      }
      saveResult = data as Record<string, unknown>;
    } else {
      // Fallback: service role cannot set auth.uid — update tables carefully via admin
      // Prefer configuring SUPABASE_ANON_KEY. This path mirrors RPC unlock logic.
      const { data, error } = await admin.rpc("save_ai_practice_evaluation", {
        p_session_id: sessionId,
        p_overall_percent: evaluation.overall_percent,
        p_passed: evaluation.passed,
        p_area_scores: evaluation.areas,
      });
      // Will fail without auth.uid — surface clear error
      if (error || !(data as { ok?: boolean })?.ok) {
        return jsonResponse(
          {
            ok: false,
            error:
              (data as { error?: string })?.error ||
              error?.message ||
              "Failed to save evaluation (set SUPABASE_ANON_KEY for edge function)",
          },
          500,
        );
      }
      saveResult = data as Record<string, unknown>;
    }

    if (!saveResult?.ok) {
      return jsonResponse(
        {
          ok: false,
          error: (saveResult?.error as string) || "Failed to save evaluation",
        },
        400,
      );
    }

    return jsonResponse({
      ok: true,
      session_id: sessionId,
      track,
      level,
      overall_percent: evaluation.overall_percent,
      passed: evaluation.passed,
      areas: evaluation.areas,
      unlocked_level: saveResult.unlocked_level ?? null,
      track_completed: Boolean(saveResult.track_completed),
      duration_seconds: session.duration_seconds,
    });
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e) }, 500);
  }
});
