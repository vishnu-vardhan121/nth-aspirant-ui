/**
 * Pure audio utility functions for AI Practice voice sessions.
 * Ported from HirecruitAI — no React dependencies.
 */

export function normalizeText(text) {
  return (text || '')
    .replace(/\s+/g, ' ')
    .replace(/(\s*\n\s*)+/g, '\n')
    .trim();
}

export function uint8ToBase64(u8) {
  const CHUNK = 0x8000;
  let bin = '';
  for (let i = 0; i < u8.length; i += CHUNK) {
    bin += String.fromCharCode(...u8.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

export function float32ToInt16(float32) {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

export function decodeBase64PcmToFloat32(base64) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 0x8000;
  return float32;
}

export function resampleFloat32(input, inRate, outRate) {
  if (!input?.length) return new Float32Array(0);
  if (inRate === outRate) return input;

  if (inRate === 48_000 && outRate === 16_000) {
    const out = new Float32Array(Math.floor(input.length / 3));
    for (let i = 0, j = 0; j < out.length; i += 3, j++) out[j] = input[i];
    return out;
  }

  const outLen = Math.max(1, Math.floor(input.length * (outRate / inRate)));
  const out = new Float32Array(outLen);
  const step = inRate / outRate;

  for (let i = 0; i < outLen; i++) {
    const pos = i * step;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const s0 = input[idx] ?? 0;
    const s1 = input[idx + 1] ?? s0;
    out[i] = s0 + (s1 - s0) * frac;
  }
  return out;
}

export function computeRms(samples) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

export function parseSampleRate(mimeType, fallback = 24_000) {
  const m = mimeType?.match(/rate=(\d+)/);
  return m?.[1] ? parseInt(m[1], 10) || fallback : fallback;
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
