/** Shared admin filter copy — interviewer readiness on completed mocks. */

import {
  PLACEMENT_RECOMMENDATION_OPTIONS,
} from '../../lib/mockFeedback';

export const PLACEMENT_RECOMMENDATION_FILTER_OPTIONS = [
  { value: '', label: 'Any interview readiness' },
  ...PLACEMENT_RECOMMENDATION_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label,
  })),
];

/** @deprecated use PLACEMENT_RECOMMENDATION_FILTER_OPTIONS */
export const PLACEMENT_READINESS_FILTER_OPTIONS = PLACEMENT_RECOMMENDATION_FILTER_OPTIONS;

export const JOB_APPLICATION_STATUS_OPTIONS = [
  { value: '', label: 'Any application status' },
  { value: 'applied', label: 'Applied' },
  { value: 'shortlisted', label: 'Shortlisted for this job' },
  { value: 'rejected', label: 'Rejected for this job' },
];
