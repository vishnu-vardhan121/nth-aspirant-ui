/**
 * Topic rubrics per track + level for AI Practice evaluation.
 * Each area is scored 0–2 after the session; pass = overall ≥ 70%.
 *
 * Full MVP rubrics: frontend + communication (+ backend starter).
 * Other tracks use category generics.
 */

import { getTrackById } from './tracks';

const FRONTEND = {
  1: [
    'HTML fundamentals',
    'CSS basics',
    'JavaScript basics',
    'DOM basics',
    'Browser debugging',
    'Web tools (git/npm basics)',
    'Simple problem solving',
    'Clear communication',
  ],
  2: [
    'React / component model',
    'State and props',
    'Hooks fundamentals',
    'API integration',
    'Routing and navigation',
    'Forms and validation',
    'Performance awareness',
    'Explaining tradeoffs',
  ],
  3: [
    'Advanced React patterns',
    'State architecture',
    'Rendering performance',
    'Frontend system design',
    'Accessibility and UX edge cases',
    'Testing strategy',
    'Security basics (XSS/CSRF)',
    'Architecture tradeoffs under pressure',
  ],
};

const COMMUNICATION = {
  1: [
    'Self introduction',
    'Clarity and pace',
    'Listening and answering directly',
    'Simple strengths / weaknesses',
    'Motivation and goals',
    'Basic situational answers',
    'Professional tone',
    'Confidence without fluff',
  ],
  2: [
    'Project walkthrough',
    'STAR-style storytelling',
    'Teamwork examples',
    'Handling disagreement',
    'Why this role / company',
    'Explaining failures and learning',
    'Structured thinking',
    'Follow-up depth',
  ],
  3: [
    'Pressure / stress questions',
    'Leadership and ownership',
    'Conflict with stakeholders',
    'Ambiguity and prioritization',
    'Persuasion and influence',
    'Handling pushback',
    'Executive-level clarity',
    'Composure under rapid follow-ups',
  ],
};

const BACKEND = {
  1: [
    'HTTP / REST basics',
    'API request/response',
    'Databases basics',
    'CRUD operations',
    'Auth concepts (intro)',
    'Error handling basics',
    'Simple problem solving',
    'Clear communication',
  ],
  2: [
    'API design',
    'SQL / queries',
    'Auth & sessions',
    'Validation & errors',
    'Caching awareness',
    'Logging & debugging',
    'Service boundaries',
    'Explaining tradeoffs',
  ],
  3: [
    'System design (backend)',
    'Scalability',
    'Consistency & transactions',
    'Caching strategy',
    'Security hardening',
    'Observability',
    'Failure modes',
    'Architecture under pressure',
  ],
};

const TECHNICAL_GENERIC = {
  1: [
    'Core concepts',
    'Basic terminology',
    'Simple workflows',
    'Tools awareness',
    'Debugging mindset',
    'Practical examples',
    'Problem solving',
    'Clear communication',
  ],
  2: [
    'Intermediate concepts',
    'Real project scenarios',
    'APIs and integrations',
    'Data handling',
    'Reliability and errors',
    'Tradeoffs',
    'Collaboration',
    'Structured explanation',
  ],
  3: [
    'Advanced concepts',
    'System design thinking',
    'Scalability',
    'Performance',
    'Security awareness',
    'Architecture decisions',
    'Ambiguous problem solving',
    'Pressure communication',
  ],
};

const NON_TECHNICAL_GENERIC = {
  1: [
    'Role fundamentals',
    'Day-to-day responsibilities',
    'Basic process knowledge',
    'Stakeholder awareness',
    'Communication basics',
    'Prioritization',
    'Simple scenarios',
    'Professional presence',
  ],
  2: [
    'Process ownership',
    'Cross-team collaboration',
    'Metrics and outcomes',
    'Handling objections',
    'Planning and execution',
    'Customer / user focus',
    'Conflict handling',
    'Structured storytelling',
  ],
  3: [
    'Strategy and judgment',
    'Ambiguous situations',
    'Leadership influence',
    'Stakeholder management',
    'Risk and tradeoffs',
    'High-pressure scenarios',
    'Decision justification',
    'Executive communication',
  ],
};

/** Track-specific overrides. Missing tracks fall back by category. */
export const AI_PRACTICE_RUBRICS = {
  frontend: FRONTEND,
  communication: COMMUNICATION,
  backend: BACKEND,
};

const CATEGORY_FALLBACK = {
  technical: TECHNICAL_GENERIC,
  non_technical: NON_TECHNICAL_GENERIC,
  communication: COMMUNICATION,
};

/**
 * @param {string} trackId
 * @param {number} level 1 | 2 | 3
 * @returns {string[]}
 */
export function getRubricAreas(trackId, level) {
  const lvl = Number(level);
  if (lvl < 1 || lvl > 3) return [];

  const specific = AI_PRACTICE_RUBRICS[String(trackId || '').toLowerCase()]?.[lvl];
  if (Array.isArray(specific) && specific.length) return [...specific];

  const track = getTrackById(trackId);
  const fallback = CATEGORY_FALLBACK[track?.category || 'technical']?.[lvl];
  return Array.isArray(fallback) ? [...fallback] : [...TECHNICAL_GENERIC[lvl]];
}

/**
 * Max points if each area is scored 0–2.
 * @param {string} trackId
 * @param {number} level
 */
export function getRubricMaxPoints(trackId, level) {
  return getRubricAreas(trackId, level).length * 2;
}

/** Pass threshold (matches DB rule). */
export const AI_PRACTICE_PASS_PERCENT = 70;
