import { PLANS } from '../users/constants';

export const INITIAL_JOB_APPLICANT_FILTERS = {
  plans: [],
  placementPipeline: '',
  applicationStatus: '',
  mockOverallMin: '',
  mockCommMin: '',
  mockTechnicalMin: '',
  mockTopicKey: '',
  mockTopicScoreMin: '',
  mockTopicScoreMax: '',
  mockTopicMode: 'any',
  roleFitKey: '',
};

export { PLANS };

export function buildJobApplicationsRpcParams(jobId, filters) {
  const plans = Array.isArray(filters.plans) && filters.plans.length > 0 ? filters.plans : null;

  const params = {
    p_job_id: jobId,
    p_plans: plans,
    p_placement_pipeline_status: filters.placementPipeline || null,
    p_application_status: filters.applicationStatus || null,
    p_mock_overall_min: filters.mockOverallMin ? parseFloat(filters.mockOverallMin) : null,
    p_mock_communication_min: filters.mockCommMin ? parseFloat(filters.mockCommMin) : null,
    p_mock_technical_min: filters.mockTechnicalMin ? parseFloat(filters.mockTechnicalMin) : null,
    p_mock_topic_key: filters.mockTopicKey || null,
    p_mock_topic_score_min: filters.mockTopicScoreMin ? parseFloat(filters.mockTopicScoreMin) : null,
    p_mock_topic_score_max: filters.mockTopicScoreMax ? parseFloat(filters.mockTopicScoreMax) : null,
    p_mock_topic_mode: filters.mockTopicMode || 'any',
    p_role_fit_key: filters.roleFitKey || null,
  };

  // Omit optional filters when unset (RPC uses defaults).
  return params;
}

export function countActiveJobApplicantFilters(filters) {
  let count = 0;
  if (filters.plans?.length) count += 1;
  if (filters.placementPipeline) count += 1;
  if (filters.applicationStatus) count += 1;
  if (filters.mockOverallMin) count += 1;
  if (filters.mockCommMin) count += 1;
  if (filters.mockTechnicalMin) count += 1;
  if (filters.mockTopicKey) count += 1;
  if (filters.mockTopicMode && filters.mockTopicMode !== 'any') count += 1;
  if (filters.roleFitKey) count += 1;
  return count;
}

export function togglePlanInFilters(filters, plan) {
  const current = filters.plans ?? [];
  if (current.includes(plan)) {
    return { ...filters, plans: current.filter((p) => p !== plan) };
  }
  return { ...filters, plans: [...current, plan] };
}
