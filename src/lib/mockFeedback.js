import {
  MOCK_TOPIC_MAX,
  getMockTopicDef,
  makeCustomTopicKey,
  slugifyTopicKey,
} from './mockFeedbackTopics';

export {
  MOCK_TOPIC_MAX,
  MOCK_ROLE_FIT_CATEGORIES,
  MOCK_ROLE_FIT_OPTIONS,
  MOCK_RATING_OPTIONS,
  MOCK_TOPIC_CATEGORIES,
  MOCK_TOPIC_FILTER_OPTIONS,
  getMockTopicDef,
  getMockTopicLabel,
  getMockRoleFitLabel,
  getMockRatingLabel,
  getMockRatingClass,
  makeCustomTopicKey,
  slugifyTopicKey,
} from './mockFeedbackTopics';

/** @deprecated use MOCK_TOPIC_CATEGORIES — kept for imports */
export const MOCK_FEEDBACK_AREA_DEFS = [];

export const MOCK_SCORE_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Interviewer readiness (admin-only). Stored on mock_registrations.placement_recommendation. */
export const PLACEMENT_RECOMMENDATION_OPTIONS = [
  { value: 'ready_interviews', label: 'Ready for interviews', shortLabel: 'Ready', hint: 'Admin — ready for company interviews' },
  { value: 'average_good', label: 'Average (good)', shortLabel: 'Avg good', hint: 'Borderline — note why' },
  { value: 'average_poor', label: 'Average (poor)', shortLabel: 'Avg poor', hint: 'Borderline — note why' },
  { value: 'not_yet', label: 'Not yet', shortLabel: 'Not yet', hint: 'More mocks / prep needed' },
];

export const PLACEMENT_RECOMMENDATION_VALUES = PLACEMENT_RECOMMENDATION_OPTIONS.map((o) => o.value);

/** Map legacy stored values to current keys. */
export function normalizePlacementRecommendation(value) {
  if (!value) return null;
  const v = String(value).trim().toLowerCase();
  if (v === 'yes') return 'ready_interviews';
  if (v === 'no') return 'not_yet';
  if (PLACEMENT_RECOMMENDATION_VALUES.includes(v)) return v;
  return v;
}

const MIN_OVERALL = 30;
const MIN_TOPIC_TEXT = 20;
const MIN_PLACEMENT_NOTE = 20;

/** Stored when interviewer leaves per-topic suggestions blank (backend requires ≥20 chars). */
export const TOPIC_SUGGESTIONS_PLACEHOLDER = 'No additional suggestions for this topic.';

export function isTopicSuggestionsPlaceholder(suggestions) {
  return (suggestions?.trim() ?? '') === TOPIC_SUGGESTIONS_PLACEHOLDER;
}

/** Payload for submit_mock_feedback — empty UI field becomes a hidden placeholder. */
export function topicSuggestionsForPayload(suggestions) {
  const s = suggestions?.trim();
  return s || TOPIC_SUGGESTIONS_PLACEHOLDER;
}

/** Aspirant-facing display — omit blank and placeholder values. */
export function topicSuggestionsForDisplay(suggestions) {
  const s = suggestions?.trim();
  if (!s || isTopicSuggestionsPlaceholder(s)) return '';
  return s;
}

function emptyTopicRow() {
  return {
    score: 5,
    rating: 'average',
    feedback: '',
    suggestions: '',
    label: '',
    category: null,
    isCustom: false,
  };
}

export function createEmptyMockFeedbackForm() {
  return {
    overall_score: 5,
    communication_score: 5,
    feedback_notes: '',
    overall_suggestions: '',
    communication_admin_note: '',
    placement_recommendation: '',
    placement_recommendation_note: '',
    selectedKeys: [],
    topics: {},
    role_fit_keys: [],
  };
}

/** True if the user has entered anything worth keeping (accidental close guard). */
export function hasMockFeedbackDraft(form) {
  if (!form) return false;
  if ((form.selectedKeys?.length ?? 0) > 0) return true;
  if (form.feedback_notes?.trim()) return true;
  if (form.overall_suggestions?.trim()) return true;
  if (form.communication_admin_note?.trim()) return true;
  if (form.placement_recommendation) return true;
  if (form.placement_recommendation_note?.trim()) return true;
  if ((form.role_fit_keys?.length ?? 0) > 0) return true;
  if (form.overall_score !== 5 || form.communication_score !== 5) return true;
  for (const row of Object.values(form.topics ?? {})) {
    if (row?.feedback?.trim() || row?.suggestions?.trim() || row?.label?.trim()) return true;
  }
  return false;
}

export function toggleTopicInForm(form, topicKey, topicMeta) {
  const selected = new Set(form.selectedKeys ?? []);
  const topics = { ...(form.topics ?? {}) };

  if (selected.has(topicKey)) {
    selected.delete(topicKey);
    delete topics[topicKey];
  } else {
    if (selected.size >= MOCK_TOPIC_MAX) return form;
    selected.add(topicKey);
    topics[topicKey] = {
      ...emptyTopicRow(),
      label: topicMeta?.label ?? topicKey,
      category: topicMeta?.category ?? null,
      isCustom: Boolean(topicMeta?.isCustom),
    };
  }

  return { ...form, selectedKeys: [...selected], topics };
}

export function addCustomTopicToForm(form, rawLabel) {
  const label = rawLabel?.trim();
  if (!label) return { form, error: 'Enter a topic name' };
  if ((form.selectedKeys?.length ?? 0) >= MOCK_TOPIC_MAX) {
    return { form, error: `Maximum ${MOCK_TOPIC_MAX} topics per mock` };
  }
  const key = makeCustomTopicKey(label);
  if (form.selectedKeys?.includes(key)) {
    return { form, error: 'That custom topic is already added' };
  }
  return {
    form: toggleTopicInForm(form, key, { label, category: 'custom', isCustom: true }),
    error: null,
  };
}

export function toggleRoleFitInForm(form, roleKey) {
  const current = form.role_fit_keys ?? [];
  if (current.includes(roleKey)) {
    return { ...form, role_fit_keys: current.filter((k) => k !== roleKey) };
  }
  return { ...form, role_fit_keys: [...current, roleKey] };
}

/** @returns {{ version: 2, areas: Array<object>, role_fit: string[] }} */
export function buildTechFeedbackPayload(form) {
  const areas = (form.selectedKeys ?? []).map((key) => {
    const row = form.topics?.[key] ?? {};
    const def = getMockTopicDef(key);
    const label = row.label?.trim() || def?.label || key;
    return {
      key,
      label,
      category: row.category ?? def?.category ?? null,
      score: row.score,
      rating: row.rating,
      feedback: row.feedback?.trim() || '',
      suggestions: topicSuggestionsForPayload(row.suggestions),
      notes: row.feedback?.trim() || '',
    };
  });
  return {
    version: 2,
    overall_suggestions: form.overall_suggestions?.trim() || null,
    role_fit: form.role_fit_keys ?? [],
    placement_recommendation: normalizePlacementRecommendation(form.placement_recommendation) || null,
    placement_recommendation_note: form.placement_recommendation_note?.trim() || null,
    communication_admin_note: form.communication_admin_note?.trim() || null,
    areas,
  };
}

export function validateMockFeedbackForm(form) {
  if (form.overall_score == null || form.overall_score < 0 || form.overall_score > 10) {
    return 'Overall score must be 0–10.';
  }
  if (form.communication_score == null || form.communication_score < 0 || form.communication_score > 10) {
    return 'Communication score must be 0–10.';
  }
  if (!form.feedback_notes?.trim() || form.feedback_notes.trim().length < MIN_OVERALL) {
    return `Overall summary is required (at least ${MIN_OVERALL} characters).`;
  }

  const placement = normalizePlacementRecommendation(form.placement_recommendation);
  if (!placement || !PLACEMENT_RECOMMENDATION_VALUES.includes(placement)) {
    return 'Select interview readiness (admin only).';
  }
  if (
    (placement === 'average_good' || placement === 'average_poor') &&
    (!form.placement_recommendation_note?.trim() || form.placement_recommendation_note.trim().length < MIN_PLACEMENT_NOTE)
  ) {
    return `For Average ratings, add a why note (at least ${MIN_PLACEMENT_NOTE} characters).`;
  }

  const keys = form.selectedKeys ?? [];
  if (keys.length === 0) {
    return 'Select at least one interview topic.';
  }
  if (keys.length > MOCK_TOPIC_MAX) {
    return `Maximum ${MOCK_TOPIC_MAX} topics per mock.`;
  }

  for (const key of keys) {
    const row = form.topics?.[key];
    if (!row) return 'Complete feedback for each selected topic.';
    const label = row.label?.trim() || getMockTopicDef(key)?.label || key;
    if (!row.rating || !['good', 'average', 'needs_work'].includes(row.rating)) {
      return `Choose a rating for ${label}.`;
    }
    if (row.score == null || row.score < 0 || row.score > 10) {
      return `Score for ${label} must be 0–10.`;
    }
    if (!row.feedback?.trim() || row.feedback.trim().length < MIN_TOPIC_TEXT) {
      return `Feedback for ${label} is required (at least ${MIN_TOPIC_TEXT} characters).`;
    }
    const suggestions = row.suggestions?.trim();
    if (suggestions && suggestions.length < MIN_TOPIC_TEXT) {
      return `Suggestions for ${label} need at least ${MIN_TOPIC_TEXT} characters if provided.`;
    }
  }

  return null;
}

export function getTechFeedbackAreas(reg) {
  const raw = reg?.tech_feedback;
  if (!raw) return [];
  let areas = [];
  if (Array.isArray(raw.areas)) areas = raw.areas;
  else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      areas = Array.isArray(parsed.areas) ? parsed.areas : [];
    } catch {
      return [];
    }
  }
  return areas.map((a) => ({
    ...a,
    feedback: a.feedback ?? a.notes ?? '',
    suggestions: a.suggestions ?? '',
  }));
}

export function getOverallSuggestions(reg) {
  const raw = reg?.tech_feedback;
  if (!raw || typeof raw !== 'object') return '';
  return raw.overall_suggestions?.trim?.() ? raw.overall_suggestions.trim() : '';
}

/** Internal interviewer tags — column preferred; never shown to aspirants in UI. */
export function getRoleFitKeys(reg) {
  if (Array.isArray(reg?.role_fit_keys) && reg.role_fit_keys.length > 0) {
    return reg.role_fit_keys;
  }
  const raw = reg?.tech_feedback;
  if (raw && Array.isArray(raw.role_fit)) return raw.role_fit;
  return [];
}

export function getPlacementRecommendation(reg) {
  return normalizePlacementRecommendation(reg?.placement_recommendation);
}

export function getPlacementRecommendationNote(reg) {
  const note = reg?.placement_recommendation_note?.trim?.();
  return note || '';
}

export function getCommunicationAdminNote(reg) {
  const note = reg?.communication_admin_note?.trim?.();
  return note || '';
}

export function getPlacementRecommendationLabel(value) {
  const normalized = normalizePlacementRecommendation(value);
  return PLACEMENT_RECOMMENDATION_OPTIONS.find((o) => o.value === normalized)?.label ?? normalized ?? '—';
}

export function getPlacementRecommendationShortLabel(value) {
  const normalized = normalizePlacementRecommendation(value);
  return PLACEMENT_RECOMMENDATION_OPTIONS.find((o) => o.value === normalized)?.shortLabel ?? normalized ?? '—';
}

export function hasInternalMockFeedback(reg) {
  return Boolean(
    getPlacementRecommendation(reg) ||
      getPlacementRecommendationNote(reg) ||
      getCommunicationAdminNote(reg) ||
      getRoleFitKeys(reg).length > 0,
  );
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

/** Build feedback form from an existing registration (for edit). */
export function mockFeedbackFormFromRegistration(reg) {
  if (!reg || !hasAnyMockFeedback(reg)) return createEmptyMockFeedbackForm();

  const areas = getTechFeedbackAreas(reg);
  const selectedKeys = [];
  const topics = {};

  for (const area of areas) {
    const key = area.key || makeCustomTopicKey(area.label || 'topic');
    if (selectedKeys.includes(key)) continue;
    selectedKeys.push(key);
    const def = getMockTopicDef(key);
    topics[key] = {
      score: area.score ?? 5,
      rating: area.rating || 'average',
      feedback: area.feedback || '',
      suggestions: topicSuggestionsForDisplay(area.suggestions),
      label: area.label || def?.label || key,
      category: area.category ?? def?.category ?? null,
      isCustom: key.startsWith('custom_') || Boolean(area.isCustom),
    };
  }

  return {
    overall_score: reg.overall_score ?? 5,
    communication_score: reg.communication_score ?? 5,
    feedback_notes: reg.feedback_notes || '',
    overall_suggestions: getOverallSuggestions(reg),
    communication_admin_note: getCommunicationAdminNote(reg),
    placement_recommendation: getPlacementRecommendation(reg) || '',
    placement_recommendation_note: getPlacementRecommendationNote(reg),
    selectedKeys,
    topics,
    role_fit_keys: getRoleFitKeys(reg),
  };
}

export function formatFeedbackSummary(reg) {
  const areas = getTechFeedbackAreas(reg);
  if (areas.length > 0 && reg.overall_score != null) {
    return `Overall ${reg.overall_score}/10 · Comm ${reg.communication_score ?? '—'}/10 · ${areas.length} topic${areas.length === 1 ? '' : 's'}`;
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

/** Admin: remove mistaken feedback; mock returns to scheduled with slot/schedule unchanged. */
export async function revertMockFeedback(supabase, registrationId) {
  const { data, error } = await supabase.rpc('revert_mock_feedback', {
    p_registration_id: registrationId,
  });
  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: 'Failed to revert feedback' };
}
