const DRAFT_PREFIX = 'nth-onboarding-draft:';

export function loadOnboardingDraft(userId) {
  if (!userId) return null;
  try {
    const raw = sessionStorage.getItem(`${DRAFT_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function saveOnboardingDraft(userId, draft) {
  if (!userId) return;
  try {
    sessionStorage.setItem(`${DRAFT_PREFIX}${userId}`, JSON.stringify(draft));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearOnboardingDraft(userId) {
  if (!userId) return;
  try {
    sessionStorage.removeItem(`${DRAFT_PREFIX}${userId}`);
  } catch {
    /* ignore */
  }
}
