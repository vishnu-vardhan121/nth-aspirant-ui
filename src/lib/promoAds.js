import { supabase } from './supabase';
import { isSubscriptionActive } from './planLimits';

const PROMO_SELECT =
  'id, institute_name, title, body_text, image_url, link_url, is_active, audience_all, audience_ai_ml, audience_base, audience_silver, audience_gold, priority, updated_at, created_at';

export function hasPromoContent(ad) {
  if (!ad) return false;
  const hasText = Boolean(String(ad.title ?? '').trim() || String(ad.body_text ?? '').trim());
  const hasImage = Boolean(String(ad.image_url ?? '').trim());
  return hasText || hasImage;
}

export function isValidPromoLink(link) {
  const t = String(link ?? '').trim();
  if (!t) return true;
  if (t.startsWith('/')) return t.length > 1;
  try {
    const u = new URL(t);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * @param {object} ad
 * @param {{ isLanding?: boolean, plan?: string|null, planStartedAt?: string|null, hasAiMl?: boolean }} viewer
 */
export function adMatchesViewer(ad, viewer = {}) {
  if (!ad || !ad.is_active || !hasPromoContent(ad)) return false;

  if (viewer.isLanding) {
    return Boolean(ad.audience_all);
  }

  if (ad.audience_all) return true;
  if (ad.audience_ai_ml && viewer.hasAiMl) return true;

  const plan = viewer.plan;
  const active = plan && isSubscriptionActive(plan, viewer.planStartedAt);
  if (!active) return false;

  if (ad.audience_base && plan === 'base') return true;
  if (ad.audience_silver && plan === 'silver') return true;
  if (ad.audience_gold && plan === 'gold') return true;

  return false;
}

export function pickPromoAd(ads, viewer) {
  const list = Array.isArray(ads) ? ads : [];
  const matches = list.filter((ad) => adMatchesViewer(ad, viewer));
  if (matches.length === 0) return null;
  matches.sort((a, b) => {
    const p = (b.priority ?? 0) - (a.priority ?? 0);
    if (p !== 0) return p;
    const bu = new Date(b.updated_at || b.created_at || 0).getTime();
    const au = new Date(a.updated_at || a.created_at || 0).getTime();
    return bu - au;
  });
  return matches[0];
}

/** Shape used by PromoAdModal */
export function toPromoModalAd(ad) {
  if (!ad) return null;
  return {
    id: ad.id,
    name: ad.institute_name || '',
    title: String(ad.title ?? '').trim(),
    bodyText: String(ad.body_text ?? '').trim(),
    imageUrl: String(ad.image_url ?? '').trim(),
    linkUrl: String(ad.link_url ?? '').trim(),
  };
}

export async function fetchActivePromoAds() {
  const { data, error } = await supabase
    .from('institute_ads')
    .select(PROMO_SELECT)
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) return { ok: false, error: error.message, ads: [] };
  return { ok: true, ads: data ?? [] };
}

/** @param {'landing' | 'dashboard'} [surface] */
export function sessionDismissKey(adId, surface = 'landing') {
  return `nth_promo_ad_dismissed_${surface}_${adId}`;
}

/** @param {'landing' | 'dashboard'} [surface] */
export function wasPromoDismissedThisSession(adId, surface = 'landing') {
  if (!adId || typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(sessionDismissKey(adId, surface)) === '1';
  } catch {
    return false;
  }
}

/** @param {'landing' | 'dashboard'} [surface] */
export function markPromoDismissedThisSession(adId, surface = 'landing') {
  if (!adId || typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(sessionDismissKey(adId, surface), '1');
  } catch {
    /* ignore */
  }
}
