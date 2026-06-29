import { supabase } from './supabase';

export async function fetchInterviewerCandidateProfile(mockRegistrationId) {
  const { data, error } = await supabase.rpc('get_aspirant_profile_for_interviewer', {
    p_mock_registration_id: mockRegistrationId,
  });
  if (error) throw error;
  const payload = typeof data === 'string' ? JSON.parse(data) : data;
  if (!payload?.ok) throw new Error(payload?.error || 'Could not load candidate profile');
  return payload;
}

export async function fetchInterviewerResumeSignedUrl(resumePath) {
  if (!resumePath) return null;
  const { data, error } = await supabase.storage.from('resumes').createSignedUrl(resumePath, 3600);
  if (error) throw error;
  return data?.signedUrl ?? null;
}
