import { useCallback, useEffect, useState } from 'react';
import { listActiveCourses } from '../lib/courses';
import {
  fetchActivePromoAds,
  markPromoDismissedThisSession,
  pickPromoAd,
  toPromoModalAd,
  wasPromoDismissedThisSession,
} from '../lib/promoAds';

/** After login / signup — show matching promo on dashboard with no scroll. */
export const DASHBOARD_PROMO_DELAY_MS = 3000;

/**
 * Pick one matching promo for the aspirant dashboard.
 * Rule: wait 3s after dashboard is ready (not blocked by contact/celebration),
 * then open once per session for this surface. Landing uses its own 5s+scroll rule.
 */
export function useDashboardPromoAd({
  enabled,
  plan,
  planStartedAt,
  blocked = false,
}) {
  const [promoAd, setPromoAd] = useState(null);
  const [open, setOpen] = useState(false);
  const [readyToShow, setReadyToShow] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setPromoAd(null);
      setOpen(false);
      setReadyToShow(false);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      const [adsRes, coursesRes] = await Promise.all([
        fetchActivePromoAds(),
        listActiveCourses().catch(() => ({ courses: [] })),
      ]);
      if (cancelled) return;

      const hasAiMl = Boolean(
        (coursesRes.courses || []).some((c) => c.membership_status === 'free')
      );
      const picked = pickPromoAd(adsRes.ads || [], {
        isLanding: false,
        plan,
        planStartedAt,
        hasAiMl,
      });

      if (!picked || wasPromoDismissedThisSession(picked.id, 'dashboard')) {
        setPromoAd(null);
        setReadyToShow(false);
        return;
      }

      setPromoAd(picked);
      setReadyToShow(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, plan, planStartedAt]);

  useEffect(() => {
    if (!readyToShow || !promoAd || blocked) {
      setOpen(false);
      return undefined;
    }

    const t = window.setTimeout(() => {
      setOpen(true);
    }, DASHBOARD_PROMO_DELAY_MS);

    return () => window.clearTimeout(t);
  }, [readyToShow, promoAd, blocked]);

  const close = useCallback(() => {
    setOpen(false);
    setReadyToShow(false);
    if (promoAd?.id) markPromoDismissedThisSession(promoAd.id, 'dashboard');
  }, [promoAd?.id]);

  return {
    open: open && Boolean(promoAd) && !blocked,
    ad: toPromoModalAd(promoAd),
    close,
  };
}
