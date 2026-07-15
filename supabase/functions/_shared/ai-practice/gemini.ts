/**
 * Gemini Live constrained ephemeral token creation.
 * Ported from HirecruitAI gemini.service.js — uses per-request API key from DB pool.
 */

import { GoogleGenAI } from "npm:@google/genai@1.43.0";

export const LIVE_API_MODEL_ID =
  Deno.env.get("GEMINI_LIVE_MODEL_ID") ??
  "gemini-2.5-flash-native-audio-preview-12-2025";

const API_VERSION = "v1alpha";

const ALLOWED_VOICE_NAMES = new Set([
  "Puck",
  "Charon",
  "Kore",
  "Fenrir",
  "Aoede",
  "Leda",
  "Orus",
  "Zephyr",
  "Umbriel",
  "Gacrux",
  "Zubenelgenubi",
  "Enceladus",
  "Callirrhoe",
  "Algenib",
]);

export type ConstrainedTokenResult = {
  name: string;
  expireTime: string;
  newSessionExpireTime: string;
  model: string;
};

function toIso(value: unknown, fallback: string | Date): string {
  const fallbackIso =
    typeof fallback === "string" ? fallback : fallback.toISOString();
  if (!value) return fallbackIso;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  try {
    return new Date(String(value)).toISOString();
  } catch {
    return fallbackIso;
  }
}

function computeTokenExpiry(expireMinutes: number, newSessionExpireMinutes: number) {
  const now = Date.now();
  // SDK CreateAuthTokenConfig expects ISO strings (not Date). Wrong type → Google
  // ignores the fields and defaults newSessionExpireTime to 60s.
  return {
    expireTime: new Date(now + expireMinutes * 60_000).toISOString(),
    newSessionExpireTime: new Date(now + newSessionExpireMinutes * 60_000)
      .toISOString(),
  };
}

export function getLiveWsConfig(model = LIVE_API_MODEL_ID) {
  const base =
    "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage." +
    API_VERSION +
    ".GenerativeService";
  return {
    model,
    wsEndpoint: `${base}.BidiGenerateContentConstrained`,
    apiVersion: API_VERSION,
    features: {
      sessionResumption: true,
      contextWindowCompression: true,
      nativeAudio: true,
    },
  };
}

/**
 * Create a constrained Live API token locked to model + system instruction.
 */
export async function createConstrainedLiveToken(options: {
  apiKey: string;
  systemInstruction: string;
  voiceName?: string;
  uses?: number;
  expireMinutes?: number;
  newSessionExpireMinutes?: number;
}): Promise<ConstrainedTokenResult> {
  const {
    apiKey,
    systemInstruction,
    uses = 2,
    expireMinutes = 20,
    newSessionExpireMinutes = 2,
  } = options;

  if (!apiKey?.trim()) {
    throw new Error("Gemini API key is missing");
  }

  const voiceName = ALLOWED_VOICE_NAMES.has(options.voiceName ?? "")
    ? (options.voiceName as string)
    : "Aoede";

  const client = new GoogleGenAI({ apiKey, apiVersion: API_VERSION });
  const { expireTime, newSessionExpireTime } = computeTokenExpiry(
    expireMinutes,
    newSessionExpireMinutes,
  );

  try {
    const token = await client.authTokens.create({
      config: {
        uses,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model: LIVE_API_MODEL_ID,
          config: {
            responseModalities: ["AUDIO"],
            sessionResumption: {},
            contextWindowCompression: {
              slidingWindow: { target_tokens: "6000" },
            },
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName } },
            },
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
          },
        },
        httpOptions: { apiVersion: API_VERSION },
      },
    });

    if (!token?.name) {
      throw new Error("Gemini returned an empty token");
    }

    // Prefer times returned by Google (our local values may be ignored if format is wrong).
    return {
      name: token.name,
      expireTime: toIso(
        (token as { expireTime?: unknown }).expireTime ?? expireTime,
        expireTime,
      ),
      newSessionExpireTime: toIso(
        (token as { newSessionExpireTime?: unknown }).newSessionExpireTime ??
          newSessionExpireTime,
        newSessionExpireTime,
      ),
      model: LIVE_API_MODEL_ID,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? "Token creation failed");
    throw new Error(message);
  }
}

export const EVAL_MODEL_ID =
  Deno.env.get("GEMINI_EVAL_MODEL_ID") ?? "gemini-2.5-flash";

export type AreaScore = {
  name: string;
  score: number;
  note: string;
};

export type EvaluationResult = {
  overall_percent: number;
  passed: boolean;
  areas: AreaScore[];
};

function extractJsonObject(text: string): unknown {
  const trimmed = String(text || "").trim();
  if (!trimmed) throw new Error("Empty evaluation response");

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("Evaluation response is not JSON");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * Normalize model JSON against expected rubric areas. Recompute percent server-side.
 */
export function normalizeEvaluation(
  raw: unknown,
  expectedAreas: string[],
): EvaluationResult {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rawAreas = Array.isArray(obj.areas) ? obj.areas : [];

  const byName = new Map<string, { score: number; note: string }>();
  for (const item of rawAreas) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const name = String(row.name || "").trim();
    if (!name) continue;
    let score = Number(row.score);
    if (!Number.isFinite(score)) score = 0;
    score = Math.max(0, Math.min(2, Math.round(score)));
    byName.set(name.toLowerCase(), {
      score,
      note: String(row.note || "").trim().slice(0, 160),
    });
  }

  const areas: AreaScore[] = expectedAreas.map((name) => {
    const hit =
      byName.get(name.toLowerCase()) ||
      [...byName.entries()].find(([k]) => k.includes(name.toLowerCase()) || name.toLowerCase().includes(k))?.[1];
    return {
      name,
      score: hit?.score ?? 0,
      note: hit?.note || "Not covered enough in transcript",
    };
  });

  const maxPoints = Math.max(areas.length * 2, 1);
  const earned = areas.reduce((sum, a) => sum + a.score, 0);
  const overall_percent = Math.round((1000 * earned) / maxPoints) / 10;
  const passed = overall_percent >= 70;

  return { overall_percent, passed, areas };
}

/**
 * Score a transcript with Gemini text model.
 */
export async function evaluateTranscriptWithGemini(options: {
  apiKey: string;
  prompt: string;
  expectedAreas: string[];
}): Promise<EvaluationResult> {
  const { apiKey, prompt, expectedAreas } = options;
  if (!apiKey?.trim()) throw new Error("Gemini API key is missing");

  const client = new GoogleGenAI({ apiKey });
  const response = await client.models.generateContent({
    model: EVAL_MODEL_ID,
    contents: prompt,
    config: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });

  const text =
    typeof response?.text === "string"
      ? response.text
      : String(
        response?.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text || "")
          .join("") || "",
      );

  const parsed = extractJsonObject(text);
  return normalizeEvaluation(parsed, expectedAreas);
}
