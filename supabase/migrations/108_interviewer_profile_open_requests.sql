-- Let interviewers open candidate profile for:
-- (1) mocks assigned to them, or
-- (2) unassigned open requests in the shared queue (requested, no slot).

drop policy if exists "resumes_select_interviewer" on storage.objects;
create policy "resumes_select_interviewer"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'resumes'
    and public.is_interviewer()
    and exists (
      select 1
      from public.mock_registrations r
      where r.aspirant_id = (storage.foldername(name))[1]::uuid
        and (
          (r.interviewer_id = auth.uid() and r.status in ('scheduled', 'completed', 'requested'))
          or (r.status = 'requested' and r.slot_id is null and r.interviewer_id is null)
        )
    )
  );

create or replace function public.get_aspirant_profile_for_interviewer(p_mock_registration_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_aspirant_id uuid;
  v_row jsonb;
begin
  if not public.is_interviewer() or p_mock_registration_id is null then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;

  select r.aspirant_id
  into v_aspirant_id
  from public.mock_registrations r
  where r.id = p_mock_registration_id
    and (
      r.interviewer_id = v_uid
      or (r.status = 'requested' and r.slot_id is null and r.interviewer_id is null)
    );

  if v_aspirant_id is null then
    return jsonb_build_object('ok', false, 'error', 'Mock not found or not available to you');
  end if;

  select
    jsonb_build_object(
      'ok', true,
      'current_mock', (
        select jsonb_build_object(
          'id', r.id,
          'status', r.status,
          'scheduled_at', r.scheduled_at,
          'availability_notes', r.availability_notes
        )
        from public.mock_registrations r
        where r.id = p_mock_registration_id
      ),
      'id', a.id,
      'full_name', a.full_name,
      'email', a.email,
      'phone', a.phone,
      'city', a.city,
      'country', a.country,
      'track', a.track,
      'experience_years', a.experience_years,
      'primary_role', a.primary_role,
      'job_domain', a.job_domain,
      'job_domain_other', a.job_domain_other,
      'job_domains', a.job_domains,
      'role_title', a.role_title,
      'role_specializations', a.role_specializations,
      'current_company', a.current_company,
      'previous_company', a.previous_company,
      'employment_status', a.employment_status,
      'work_mode', a.work_mode,
      'current_ctc', a.current_ctc,
      'expected_salary_min', a.expected_salary_min,
      'expected_salary_max', a.expected_salary_max,
      'linkedin_url', a.linkedin_url,
      'portfolio_url', a.portfolio_url,
      'willing_relocate', a.willing_relocate,
      'available_from', a.available_from,
      'bio', a.bio,
      'education', a.education,
      'education_path', a.education_path,
      'intermediate_type', a.intermediate_type,
      'highest_qualification', a.highest_qualification,
      'degree_branch', a.degree_branch,
      'degree_branch_other', a.degree_branch_other,
      'graduation_year', a.graduation_year,
      'is_currently_studying', a.is_currently_studying,
      'expected_graduation_year', a.expected_graduation_year,
      'graduation_score_type', a.graduation_score_type,
      'graduation_score', a.graduation_score,
      'college_name', a.college_name,
      'premier_institute_type', a.premier_institute_type,
      'institute_tier', a.institute_tier,
      'communication_level', a.communication_level,
      'notice_period', a.notice_period,
      'skills', a.skills,
      'secondary_skills', a.secondary_skills,
      'resume_url', a.resume_url,
      'plan', a.plan
    )
    || jsonb_build_object(
      'mock_summary', (
        select jsonb_build_object(
          'completed_total', (select count(*)::int from public.mock_registrations r where r.aspirant_id = a.id and r.status = 'completed'),
          'scheduled_count', (select count(*)::int from public.mock_registrations r where r.aspirant_id = a.id and r.status = 'scheduled'),
          'latest_overall', lm.overall_score,
          'latest_communication', lm.communication_score,
          'latest_technical', lm.technical_score,
          'latest_completed_at', lm.completed_at
        )
        from lateral (
          select r.overall_score, r.communication_score, r.technical_score, r.completed_at
          from public.mock_registrations r
          where r.aspirant_id = a.id and r.status = 'completed'
          order by r.completed_at desc nulls last
          limit 1
        ) lm
      ),
      'mocks', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'status', r.status,
            'created_at', r.created_at,
            'scheduled_at', r.scheduled_at,
            'completed_at', r.completed_at,
            'interviewer_name', adm.name,
            'overall_score', r.overall_score,
            'communication_score', r.communication_score,
            'technical_score', r.technical_score,
            'feedback_notes', r.feedback_notes,
            'tech_feedback', r.tech_feedback,
            'availability_notes', r.availability_notes
          )
          order by coalesce(r.completed_at, r.scheduled_at, r.created_at) desc
        )
        from public.mock_registrations r
        left join public.admins adm on adm.id = r.interviewer_id
        where r.aspirant_id = a.id
      ), '[]'::jsonb)
    )
  into v_row
  from public.aspirants a
  where a.id = v_aspirant_id;

  if v_row is null then
    return jsonb_build_object('ok', false, 'error', 'Profile not found');
  end if;

  return v_row;
end;
$$;

comment on function public.get_aspirant_profile_for_interviewer(uuid) is
  'Interviewer: profile for assigned mocks or unassigned open requests in the shared queue.';
