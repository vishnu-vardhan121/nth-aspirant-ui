import { getSubscriptionEndsAt } from './planLimits';

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function earlierOf(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() <= b.getTime() ? a : b;
}

/**
 * Frontend-only guidance for mock booking deadlines (display; server still enforces rules).
 * @param {{ usage: object|null, plan: string|null, planStartedAt: string|null }} params
 */
export function getMockBookingGuidance({ usage, plan, planStartedAt }) {
  if (!usage?.active) {
    return { timeline: [], alerts: [], remaining: 0, bookBy: null };
  }

  const limit = usage.limit >= 0 ? usage.limit : null;
  const used = usage.used ?? 0;
  const remaining = limit != null ? Math.max(0, limit - used) : null;

  const periodStart = parseDate(usage.period_start);
  const periodEnd = parseDate(usage.period_end);
  const subscriptionEnd = getSubscriptionEndsAt(plan, planStartedAt);
  const nextBookAfter = parseDate(usage.next_book_after);
  const minDays = usage.min_days_between ?? 15;
  const now = new Date();

  const bookBy = earlierOf(periodEnd, subscriptionEnd);

  const timeline = [];
  if (periodStart) {
    timeline.push({ key: 'period_start', label: 'Mock month started', date: periodStart });
  }
  if (periodEnd) {
    timeline.push({ key: 'period_end', label: 'Mock month ends', date: periodEnd });
  }
  if (subscriptionEnd) {
    timeline.push({ key: 'plan_end', label: 'Plan expires', date: subscriptionEnd });
  }
  if (nextBookAfter && nextBookAfter > now) {
    timeline.push({ key: 'next_book', label: 'Next booking allowed', date: nextBookAfter });
  }
  if (bookBy) {
    timeline.push({ key: 'book_by', label: 'Use remaining mocks by', date: bookBy, emphasis: true });
  }

  const alerts = [];

  if (limit != null && remaining > 0 && bookBy && bookBy > now) {
    const daysLeft = Math.ceil((bookBy.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    const urgency = daysLeft <= 7 ? 'urgent' : 'info';

    if (used === 0) {
      alerts.push({
        severity: urgency,
        title: 'Book your 1st mock before time runs out',
        message:
          'Unused mocks are not carried forward. Book a slot (or request one) before your mock month or plan ends.',
        bookBy,
        remaining,
      });
    } else if (nextBookAfter && nextBookAfter >= bookBy) {
      alerts.push({
        severity: 'urgent',
        title: 'You may lose your remaining mock',
        message: `After a completed mock you must wait ${minDays} days before the next booking. That window may fall after your plan ends.`,
        bookBy,
        nextBookAfter,
        remaining,
        minDays,
      });
    } else {
      alerts.push({
        severity: urgency,
        title: 'Book your next mock before time runs out',
        message: 'Unused allowance in this period is lost when the mock month or plan ends.',
        bookBy,
        remaining,
        nextBookAfter: nextBookAfter && nextBookAfter > now ? nextBookAfter : null,
      });
    }
  }

  if (limit != null && remaining === 0 && periodEnd && periodEnd > now) {
    alerts.push({
      severity: 'neutral',
      title: 'Monthly mock allowance used',
      message: 'Your allowance resets when the next mock month starts.',
      bookBy: periodEnd,
    });
  }

  return {
    timeline,
    alerts,
    remaining: remaining ?? 0,
    bookBy: bookBy?.toISOString() ?? null,
    subscriptionEnd: subscriptionEnd?.toISOString() ?? null,
  };
}
