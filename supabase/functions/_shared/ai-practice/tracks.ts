/** Track labels + session timing for AI Practice prompts (edge). */

export const TRACK_LABELS: Record<string, string> = {
  frontend: "Frontend",
  backend: "Backend",
  fullstack: "Full Stack",
  devops: "DevOps",
  qa: "QA / Testing",
  data: "Data / Analytics",
  mobile: "Mobile",
  software: "Software / SDE",
  hr: "HR",
  marketing: "Marketing",
  sales: "Sales",
  operations: "Operations",
  finance: "Finance",
  content: "Content",
  communication: "Interview Communication",
};

export const LEVEL_LABELS: Record<number, string> = {
  1: "Basic",
  2: "Medium",
  3: "Hard",
};

/** Min / target / max minutes per level. */
export const SESSION_TIMING: Record<
  number,
  { minMinutes: number; targetMinutes: number; maxMinutes: number }
> = {
  1: { minMinutes: 8, targetMinutes: 12, maxMinutes: 15 },
  2: { minMinutes: 10, targetMinutes: 15, maxMinutes: 20 },
  3: { minMinutes: 12, targetMinutes: 18, maxMinutes: 25 },
};

export function getTrackLabel(track: string): string {
  const id = String(track || "").toLowerCase().trim();
  return TRACK_LABELS[id] ?? id;
}

export function getLevelLabel(level: number): string {
  return LEVEL_LABELS[level] ?? `Level ${level}`;
}

export function getSessionTiming(level: number) {
  return SESSION_TIMING[level] ?? SESSION_TIMING[1];
}

export function isValidTrack(track: string): boolean {
  return Boolean(TRACK_LABELS[String(track || "").toLowerCase().trim()]);
}

export function isValidLevel(level: number): boolean {
  return level === 1 || level === 2 || level === 3;
}
