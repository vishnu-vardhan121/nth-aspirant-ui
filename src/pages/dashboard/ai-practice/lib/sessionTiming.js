/**
 * Session timing for AI Practice levels (voice interviews).
 * End is disabled until minMs; auto-wrap at maxMs.
 */

export const AI_PRACTICE_SESSION_TIMING = {
  1: {
    level: 1,
    label: 'Basic',
    minMinutes: 8,
    targetMinutes: 12,
    maxMinutes: 15,
  },
  2: {
    level: 2,
    label: 'Medium',
    minMinutes: 10,
    targetMinutes: 15,
    maxMinutes: 20,
  },
  3: {
    level: 3,
    label: 'Hard',
    minMinutes: 12,
    targetMinutes: 18,
    maxMinutes: 25,
  },
};

export function getSessionTiming(level) {
  const meta = AI_PRACTICE_SESSION_TIMING[Number(level)];
  if (!meta) return null;

  return {
    ...meta,
    minMs: meta.minMinutes * 60 * 1000,
    targetMs: meta.targetMinutes * 60 * 1000,
    maxMs: meta.maxMinutes * 60 * 1000,
  };
}

export function formatDurationMs(ms) {
  const totalSec = Math.max(0, Math.floor(Number(ms) / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
