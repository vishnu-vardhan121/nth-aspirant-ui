/**
 * Rubric topic areas for live prompts + evaluation.
 * Keep in sync with src/pages/dashboard/ai-practice/lib/rubrics.js
 */

const FRONTEND: Record<number, string[]> = {
  1: [
    "HTML fundamentals",
    "CSS basics",
    "JavaScript basics",
    "DOM basics",
    "Browser debugging",
    "Web tools (git/npm basics)",
    "Simple problem solving",
    "Clear communication",
  ],
  2: [
    "React / component model",
    "State and props",
    "Hooks fundamentals",
    "API integration",
    "Routing and navigation",
    "Forms and validation",
    "Performance awareness",
    "Explaining tradeoffs",
  ],
  3: [
    "Advanced React patterns",
    "State architecture",
    "Rendering performance",
    "Frontend system design",
    "Accessibility and UX edge cases",
    "Testing strategy",
    "Security basics (XSS/CSRF)",
    "Architecture tradeoffs under pressure",
  ],
};

const COMMUNICATION: Record<number, string[]> = {
  1: [
    "Self introduction",
    "Clarity and pace",
    "Listening and answering directly",
    "Simple strengths / weaknesses",
    "Motivation and goals",
    "Basic situational answers",
    "Professional tone",
    "Confidence without fluff",
  ],
  2: [
    "Project walkthrough",
    "STAR-style storytelling",
    "Teamwork examples",
    "Handling disagreement",
    "Why this role / company",
    "Explaining failures and learning",
    "Structured thinking",
    "Follow-up depth",
  ],
  3: [
    "Pressure / stress questions",
    "Leadership and ownership",
    "Conflict with stakeholders",
    "Ambiguity and prioritization",
    "Persuasion and influence",
    "Handling pushback",
    "Executive-level clarity",
    "Composure under rapid follow-ups",
  ],
};

const BACKEND: Record<number, string[]> = {
  1: [
    "HTTP / REST basics",
    "API request/response",
    "Databases basics",
    "CRUD operations",
    "Auth concepts (intro)",
    "Error handling basics",
    "Simple problem solving",
    "Clear communication",
  ],
  2: [
    "API design",
    "SQL / queries",
    "Auth & sessions",
    "Validation & errors",
    "Caching awareness",
    "Logging & debugging",
    "Service boundaries",
    "Explaining tradeoffs",
  ],
  3: [
    "System design (backend)",
    "Scalability",
    "Consistency & transactions",
    "Caching strategy",
    "Security hardening",
    "Observability",
    "Failure modes",
    "Architecture under pressure",
  ],
};

const TECHNICAL_GENERIC: Record<number, string[]> = {
  1: [
    "Core concepts",
    "Basic terminology",
    "Simple workflows",
    "Tools awareness",
    "Debugging mindset",
    "Practical examples",
    "Problem solving",
    "Clear communication",
  ],
  2: [
    "Intermediate concepts",
    "Real project scenarios",
    "APIs and integrations",
    "Data handling",
    "Reliability and errors",
    "Tradeoffs",
    "Collaboration",
    "Structured explanation",
  ],
  3: [
    "Advanced concepts",
    "System design thinking",
    "Scalability",
    "Performance",
    "Security awareness",
    "Architecture decisions",
    "Ambiguous problem solving",
    "Pressure communication",
  ],
};

const NON_TECHNICAL_GENERIC: Record<number, string[]> = {
  1: [
    "Role fundamentals",
    "Day-to-day responsibilities",
    "Basic process knowledge",
    "Stakeholder awareness",
    "Communication basics",
    "Prioritization",
    "Simple scenarios",
    "Professional presence",
  ],
  2: [
    "Process ownership",
    "Cross-team collaboration",
    "Metrics and outcomes",
    "Handling objections",
    "Planning and execution",
    "Customer / user focus",
    "Conflict handling",
    "Structured storytelling",
  ],
  3: [
    "Strategy and judgment",
    "Ambiguous situations",
    "Leadership influence",
    "Stakeholder management",
    "Risk and tradeoffs",
    "High-pressure scenarios",
    "Decision justification",
    "Executive communication",
  ],
};

const SPECIFIC: Record<string, Record<number, string[]>> = {
  frontend: FRONTEND,
  communication: COMMUNICATION,
  backend: BACKEND,
};

const NON_TECH_TRACKS = new Set([
  "hr",
  "marketing",
  "sales",
  "operations",
  "finance",
  "content",
]);

export function getRubricAreas(track: string, level: number): string[] {
  const id = String(track || "").toLowerCase().trim();
  const lvl = Number(level);
  const specific = SPECIFIC[id]?.[lvl];
  if (specific?.length) return [...specific];

  if (id === "communication") return [...(COMMUNICATION[lvl] ?? COMMUNICATION[1])];
  if (NON_TECH_TRACKS.has(id)) {
    return [...(NON_TECHNICAL_GENERIC[lvl] ?? NON_TECHNICAL_GENERIC[1])];
  }
  return [...(TECHNICAL_GENERIC[lvl] ?? TECHNICAL_GENERIC[1])];
}
