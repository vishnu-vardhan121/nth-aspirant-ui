/** AI Practice track catalog — used only by aspirant AI Practice pages. */

export const AI_PRACTICE_CATEGORIES = [
  { id: 'technical', label: 'Technical' },
  { id: 'non_technical', label: 'Non-Technical' },
  { id: 'communication', label: 'Communication' },
];

export const AI_PRACTICE_LEVELS = [
  { level: 1, id: 'basic', label: 'Basic', shortLabel: 'L1' },
  { level: 2, id: 'medium', label: 'Medium', shortLabel: 'L2' },
  { level: 3, id: 'hard', label: 'Hard', shortLabel: 'L3' },
];

export const AI_PRACTICE_TRACKS = [
  { id: 'frontend', label: 'Frontend', category: 'technical' },
  { id: 'backend', label: 'Backend', category: 'technical' },
  { id: 'fullstack', label: 'Full Stack', category: 'technical' },
  { id: 'devops', label: 'DevOps', category: 'technical' },
  { id: 'qa', label: 'QA / Testing', category: 'technical' },
  { id: 'data', label: 'Data / Analytics', category: 'technical' },
  { id: 'mobile', label: 'Mobile', category: 'technical' },
  { id: 'software', label: 'Software / SDE', category: 'technical' },
  { id: 'hr', label: 'HR', category: 'non_technical' },
  { id: 'marketing', label: 'Marketing', category: 'non_technical' },
  { id: 'sales', label: 'Sales', category: 'non_technical' },
  { id: 'operations', label: 'Operations', category: 'non_technical' },
  { id: 'finance', label: 'Finance', category: 'non_technical' },
  { id: 'content', label: 'Content', category: 'non_technical' },
  { id: 'communication', label: 'Interview Communication', category: 'communication' },
];

export function getTrackById(trackId) {
  const id = String(trackId || '').toLowerCase().trim();
  return AI_PRACTICE_TRACKS.find((t) => t.id === id) ?? null;
}

export function getTracksByCategory(categoryId) {
  return AI_PRACTICE_TRACKS.filter((t) => t.category === categoryId);
}

export function getLevelMeta(level) {
  return AI_PRACTICE_LEVELS.find((l) => l.level === Number(level)) ?? null;
}

export function isValidTrackId(trackId) {
  return Boolean(getTrackById(trackId));
}

export function isValidLevel(level) {
  const n = Number(level);
  return n === 1 || n === 2 || n === 3;
}
