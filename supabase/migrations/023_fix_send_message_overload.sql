-- Fix PGRST203: remove 4-param send_message overload so only the 5-param version exists.
-- PostgREST could not choose between send_message(..., p_job_id) and send_message(..., p_job_id, p_mock_registration_id).
-- Callers that omit p_mock_registration_id will use the 5-param function with default null.

drop function if exists public.send_message(uuid, text, text, uuid);
