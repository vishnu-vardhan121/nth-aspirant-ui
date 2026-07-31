import { INITIAL_USER_FILTERS, PAGE_SIZE } from './constants';
import { isPremierInstituteSelection, parseCollegeStandingOption } from '../../../lib/aspirantFilterOptions';

export { INITIAL_USER_FILTERS };

export function filtersReducer(state, action) {
  switch (action.type) {
    case 'patch': {
      const next = { ...state, ...action.payload };
      if (action.resetPage !== false) next.page = 0;
      return next;
    }
    case 'qualification': {
      return { ...state, qualification: action.value, branch: '', page: 0 };
    }
    case 'page':
      return { ...state, page: action.page };
    case 'reset':
      return { ...INITIAL_USER_FILTERS, page: 0 };
    default:
      return state;
  }
}

export function buildUsersListRpcParams(filters) {
  const f = filters;
  const standing = parseCollegeStandingOption(f.tier || '');
  const params = {
    p_plan: f.plan || null,
    p_track: f.track || null,
    p_search: f.search.trim() || null,
    p_job_domain: f.domain || null,
    p_highest_qualification: f.qualification || null,
    p_degree_branch: f.branch || null,
    p_graduation_year: f.batch ? parseInt(f.batch, 10) : null,
    p_graduation_score_min: f.cgpaMin ? parseFloat(f.cgpaMin) : null,
    p_premier_institute_type: isPremierInstituteSelection(f.tier) ? standing.premierInstituteType : null,
    p_institute_tier: f.tier && !isPremierInstituteSelection(f.tier) ? standing.instituteTier : null,
    p_communication_level: f.communication || null,
    p_notice_period: f.noticePeriod || null,
    p_skills: f.skills.trim() || null,
    p_mock_status: null,
    p_mock_overall_min: f.mockOverallMin ? parseFloat(f.mockOverallMin) : null,
    p_mock_communication_min: f.mockCommMin ? parseFloat(f.mockCommMin) : null,
    p_mock_technical_min: null,
    p_mock_topic_key: f.mockTopicKey || null,
    p_mock_topic_score_min: f.mockTopicScoreMin ? parseFloat(f.mockTopicScoreMin) : null,
    p_mock_topic_score_max: f.mockTopicScoreMax ? parseFloat(f.mockTopicScoreMax) : null,
    p_mock_topic_mode: f.mockTopicMode || 'any',
    p_limit: PAGE_SIZE,
    p_offset: (f.page ?? 0) * PAGE_SIZE,
  };
  // Role-fit multi-select (OR). Omit when empty so older DB signatures still match.
  const roleFitKeys = Array.isArray(f.roleFitKeys)
    ? f.roleFitKeys.map((k) => String(k).trim().toLowerCase()).filter(Boolean)
    : [];
  if (roleFitKeys.length) params.p_role_fit_keys = roleFitKeys;
  if (f.profileStatus) params.p_profile_status = f.profileStatus;
  if (f.placementRecommendation) params.p_placement_recommendation = f.placementRecommendation;
  return params;
}
