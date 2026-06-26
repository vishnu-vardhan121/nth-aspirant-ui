/** Predefined mock interview skill areas (0–10 each). */
export const MOCK_FEEDBACK_AREA_DEFS = [
  { key: 'frontend', label: 'Frontend' },
  { key: 'backend', label: 'Backend / APIs' },
  { key: 'database', label: 'Database & SQL' },
  { key: 'deployment', label: 'Deployment / DevOps' },
  { key: 'custom', label: 'Custom topic', isCustom: true },
];

export const MOCK_SCORE_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function emptyArea() {
  return { enabled: false, score: 5, notes: '', label: '' };
}

export function createEmptyMockFeedbackForm() {
  const areas = {};
  for (const def of MOCK_FEEDBACK_AREA_DEFS) {
    areas[def.key] = {
      ...emptyArea(),
      enabled: def.key === 'frontend' || def.key === 'backend',
    };
  }
  return {
    overall_score: 5,
    communication_score: 5,
    feedback_notes: '',
    areas,
  };
}

/** @returns {{ areas: Array<{ key: string, label: string, score: number, notes: string|null }> }} */
export function buildTechFeedbackPayload(form) {
  const areas = [];
  for (const def of MOCK_FEEDBACK_AREA_DEFS) {
    const row = form.areas?.[def.key];
    if (!row?.enabled) continue;
    if (def.isCustom && !row.label?.trim()) continue;
    areas.push({
      key: def.key,
      label: def.isCustom ? row.label.trim() : def.label,
      score: row.score,
      notes: row.notes?.trim() || '',
    });
  }
  return { areas };
}

export function validateMockFeedbackForm(form) {
  if (form.overall_score == null || form.overall_score < 0 || form.overall_score > 10) {
    return 'Overall score must be 0–10.';
  }
  if (form.communication_score == null || form.communication_score < 0 || form.communication_score > 10) {
    return 'Communication score must be 0–10.';
  }
  if (!form.feedback_notes?.trim() || form.feedback_notes.trim().length < 10) {
    return 'Overall feedback is required (at least 10 characters).';
  }
  const custom = form.areas?.custom;
  if (custom?.enabled && !custom.label?.trim()) {
    return 'Enter a name for the custom topic (e.g. System design, DSA).';
  }
  const payload = buildTechFeedbackPayload(form);
  if (payload.areas.length === 0) {
    return 'Enable and score at least one technical area.';
  }
  for (const def of MOCK_FEEDBACK_AREA_DEFS) {
    const row = form.areas?.[def.key];
    if (!row?.enabled) continue;
    const areaLabel = def.isCustom ? row.label?.trim() || def.label : def.label;
    if (!row.notes?.trim() || row.notes.trim().length < 10) {
      return `Written feedback is required for ${areaLabel} (at least 10 characters).`;
    }
  }
  return null;
}

export function getTechFeedbackAreas(reg) {
  const raw = reg?.tech_feedback;
  if (!raw) return [];
  if (Array.isArray(raw.areas)) return raw.areas;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.areas) ? parsed.areas : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function hasStructuredMockFeedback(reg) {
  return getTechFeedbackAreas(reg).length > 0;
}

export function hasLegacyMockFeedback(reg) {
  return [reg?.technical_score, reg?.communication_score, reg?.problem_solving_score, reg?.overall_score].every(
    (n) => n != null,
  );
}

export function hasAnyMockFeedback(reg) {
  return hasStructuredMockFeedback(reg) || hasLegacyMockFeedback(reg);
}

export function formatFeedbackSummary(reg) {
  const areas = getTechFeedbackAreas(reg);
  if (areas.length > 0 && reg.overall_score != null) {
    return `Overall ${reg.overall_score}/10 · Comm ${reg.communication_score ?? '—'}/10 · ${areas.length} area${areas.length === 1 ? '' : 's'}`;
  }
  if (hasLegacyMockFeedback(reg)) {
    return `T:${reg.technical_score} C:${reg.communication_score} P:${reg.problem_solving_score} O:${reg.overall_score}`;
  }
  return '—';
}

/** @param {import('@supabase/supabase-js').SupabaseClient} supabase */
export async function submitMockFeedback(supabase, registrationId, form) {
  const err = validateMockFeedbackForm(form);
  if (err) return { ok: false, error: err };

  const { data, error } = await supabase.rpc('submit_mock_feedback', {
    p_registration_id: registrationId,
    p_overall_score: form.overall_score,
    p_communication_score: form.communication_score,
    p_feedback_notes: form.feedback_notes?.trim() || null,
    p_tech_feedback: buildTechFeedbackPayload(form),
  });

  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: 'Failed to submit feedback' };
}
