-- Update doubt session + ops list feedback for one class.

create or replace function public.staff_update_course_doubt_session(
  p_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_meet_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text := trim(coalesce(p_title, ''));
  v_url text := trim(coalesce(p_meet_url, ''));
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not public.is_course_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed');
  end if;
  if not exists (select 1 from public.course_doubt_sessions where id = p_id) then
    return jsonb_build_object('ok', false, 'error', 'Doubt session not found');
  end if;
  if char_length(v_title) < 1 then
    return jsonb_build_object('ok', false, 'error', 'Title is required');
  end if;
  if p_starts_at is null then
    return jsonb_build_object('ok', false, 'error', 'Start time is required');
  end if;
  if char_length(v_url) < 8 then
    return jsonb_build_object('ok', false, 'error', 'Zoom link is required');
  end if;

  update public.course_doubt_sessions set
    title = v_title,
    starts_at = p_starts_at,
    meet_url = v_url
  where id = p_id;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_list_class_feedback(p_class_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not public.is_ops_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed');
  end if;
  if p_class_id is null then
    return jsonb_build_object('ok', false, 'error', 'Class is required');
  end if;

  return jsonb_build_object(
    'ok', true,
    'feedback', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id,
        'aspirant_id', f.aspirant_id,
        'full_name', a.full_name,
        'email', a.email,
        'body', f.body,
        'created_at', f.created_at,
        'updated_at', f.updated_at
      ) order by f.created_at desc)
      from public.course_class_feedback f
      join public.aspirants a on a.id = f.aspirant_id
      where f.class_id = p_class_id
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.staff_update_course_doubt_session(uuid, text, timestamptz, text) to authenticated;
grant execute on function public.admin_list_class_feedback(uuid) to authenticated;
