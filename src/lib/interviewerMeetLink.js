import { supabase } from './supabase';

export async function updateInterviewerMeetLink({ slotId, mockRegistrationId, meetLink }) {
  const { data, error } = await supabase.rpc('update_interviewer_meet_link', {
    p_meet_link: meetLink?.trim() || null,
    p_slot_id: slotId || null,
    p_mock_registration_id: mockRegistrationId || null,
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || 'Could not update Meet link');
  return data;
}
