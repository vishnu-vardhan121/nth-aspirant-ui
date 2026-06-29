/**
 * Plan validity (subscription duration) and usage limits.
 * Subscription starts at purchase time; ends exactly validity months later.
 * -1 = unlimited.
 */

export const PLAN_VALIDITY_MONTHS = { base: 1, silver: 3, gold: 5 };

export const PLAN_LIMITS = {
  base: {
    validityMonths: 1,
    jobApplicationsPerMonth: 5,
    mocksPerMonth: 2,
    directInterviewsPerPeriod: 1,
    founderSessionsPerPeriod: 0,
    messagesPerDay: 1,
  },
  silver: {
    validityMonths: 3,
    jobApplicationsPerMonth: 20,
    mocksPerMonth: 2,
    directInterviewsPerPeriod: 2,
    founderSessionsPerPeriod: 0,
    messagesPerDay: 3,
  },
  gold: {
    validityMonths: 5,
    jobApplicationsPerMonth: -1,
    mocksPerMonth: 10,
    directInterviewsPerPeriod: 8,
    founderSessionsPerPeriod: 2,
    messagesPerDay: 5,
  },
};

/** Get limit for a plan; returns undefined if plan unknown. -1 means unlimited. */
export function getJobApplicationsLimit(plan) {
  const limits = PLAN_LIMITS[plan];
  return limits?.jobApplicationsPerMonth;
}

/** Subscription end (matches DB subscription_ends_at). */
export function getSubscriptionEndsAt(plan, planStartedAt) {
  if (!plan || !planStartedAt) return null;
  const months = PLAN_VALIDITY_MONTHS[plan];
  if (!months) return null;
  const end = new Date(planStartedAt);
  if (Number.isNaN(end.getTime())) return null;
  end.setMonth(end.getMonth() + months);
  return end;
}

/** Check if subscription is still active (now < plan_started_at + validity). */
export function isSubscriptionActive(plan, planStartedAt) {
  if (!plan || !planStartedAt) return false;
  const end = getSubscriptionEndsAt(plan, planStartedAt);
  return end ? new Date() < end : false;
}
