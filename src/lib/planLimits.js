/**
 * Plan validity (subscription duration) and usage limits.
 * Subscription starts at purchase time; ends exactly validity months later.
 * -1 = unlimited.
 */

export const PLAN_VALIDITY_MONTHS = { base: 3, silver: 3, gold: 5 };

export const PLAN_LIMITS = {
  base: {
    validityMonths: 3,
    jobApplicationsPerMonth: 5,
    mocksPerPeriod: 3,
    directInterviewsPerPeriod: 1,
    founderSessionsPerPeriod: 0,
    messagesPerDay: 1,
  },
  silver: {
    validityMonths: 3,
    jobApplicationsPerMonth: 20,
    mocksPerPeriod: 3,
    directInterviewsPerPeriod: 2,
    founderSessionsPerPeriod: 0,
    messagesPerDay: 3,
  },
  gold: {
    validityMonths: 5,
    jobApplicationsPerMonth: -1,
    mocksPerPeriod: 10,
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

/** Check if subscription is still active (now < plan_started_at + validity). */
export function isSubscriptionActive(plan, planStartedAt) {
  if (!plan || !planStartedAt) return false;
  const months = PLAN_VALIDITY_MONTHS[plan];
  if (!months) return false;
  const start = new Date(planStartedAt);
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  return new Date() < end;
}
