-- Extend get_job_applications so admin can show applicant profile and resume.
-- Adds: aspirant_phone, aspirant_city, aspirant_education, aspirant_skills, aspirant_resume_url.

create or replace function public.get_job_applications(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
begin
  if not public.is_admin() then
    return '[]'::jsonb;
  end if;
  select jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'aspirant_id', a.aspirant_id,
      'aspirant_name', p.full_name,
      'aspirant_email', p.email,
      'aspirant_phone', p.phone,
      'aspirant_city', p.city,
      'aspirant_education', p.education,
      'aspirant_skills', p.skills,
      'aspirant_resume_url', p.resume_url,
      'created_at', a.created_at,
      'status', a.status
    ) order by a.created_at desc
  ) into v_rows
  from public.applications a
  join public.aspirants p on p.id = a.aspirant_id
  where a.job_id = p_job_id;
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;
