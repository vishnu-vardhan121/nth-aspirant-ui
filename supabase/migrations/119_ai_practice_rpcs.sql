-- AI Practice RPCs: progress, sessions, evaluation unlock, admin keys, analytics.
-- Depends on 118_ai_practice_schema.sql and is_subscription_active / is_admin.

-- =============================================================================
-- Helpers
-- =============================================================================

create or replace function public.ai_practice_mask_api_key(p_key text)
returns text
language sql
immutable
as $$
  select case
    when p_key is null or char_length(p_key) < 8 then '****'
    else left(p_key, 4) || '…' || right(p_key, 4)
  end;
$$;

comment on function public.ai_practice_mask_api_key(text) is
  'Mask Gemini API key for admin UI (never return full key after save).';

-- Ensure progress rows exist for a track: L1 available, L2/L3 locked (if missing).
create or replace function public.ensure_ai_practice_track_progress(
  p_aspirant_id uuid,
  p_track text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_track text := lower(trim(coalesce(p_track, '')));
begin
  if p_aspirant_id is null or v_track = '' then
    return;
  end if;

  insert into public.ai_practice_progress (aspirant_id, track, level, status)
  values
    (p_aspirant_id, v_track, 1, 'available'),
    (p_aspirant_id, v_track, 2, 'locked'),
    (p_aspirant_id, v_track, 3, 'locked')
  on conflict (aspirant_id, track, level) do nothing;
end;
$$;

-- =============================================================================
-- Aspirant: get progress
-- =============================================================================

create or replace function public.get_ai_practice_progress(p_track text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_plan text;
  v_started_at timestamptz;
  v_active boolean := false;
  v_track text := nullif(lower(trim(coalesce(p_track, ''))), '');
  v_levels jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select a.plan, a.plan_started_at into v_plan, v_started_at
  from public.aspirants a
  where a.id = v_uid;

  if v_plan is null then
    return jsonb_build_object('ok', false, 'error', 'Aspirant profile not found');
  end if;

  v_active := public.is_subscription_active(v_plan, v_started_at);

  if v_track is not null then
    perform public.ensure_ai_practice_track_progress(v_uid, v_track);

    select coalesce(jsonb_agg(
      jsonb_build_object(
        'track', p.track,
        'level', p.level,
        'status', p.status,
        'best_percent', p.best_percent,
        'passed_at', p.passed_at,
        'attempts', p.attempts
      )
      order by p.level
    ), '[]'::jsonb)
    into v_levels
    from public.ai_practice_progress p
    where p.aspirant_id = v_uid and p.track = v_track;

    return jsonb_build_object(
      'ok', true,
      'subscription_active', v_active,
      'track', v_track,
      'levels', v_levels,
      'track_completed', (
        select count(*) = 3
        from public.ai_practice_progress p
        where p.aspirant_id = v_uid and p.track = v_track and p.status = 'passed'
      )
    );
  end if;

  select coalesce(jsonb_agg(row_data order by track), '[]'::jsonb)
  into v_levels
  from (
    select
      p.track,
      jsonb_build_object(
        'track', p.track,
        'levels', jsonb_agg(
          jsonb_build_object(
            'level', p.level,
            'status', p.status,
            'best_percent', p.best_percent,
            'passed_at', p.passed_at,
            'attempts', p.attempts
          )
          order by p.level
        ),
        'passed_count', count(*) filter (where p.status = 'passed'),
        'track_completed', (count(*) filter (where p.status = 'passed') = 3)
      ) as row_data
    from public.ai_practice_progress p
    where p.aspirant_id = v_uid
    group by p.track
  ) t;

  return jsonb_build_object(
    'ok', true,
    'subscription_active', v_active,
    'tracks', v_levels
  );
end;
$$;

comment on function public.get_ai_practice_progress(text) is
  'Aspirant AI Practice progress. Pass track to init L1–L3 rows; omit for all started tracks.';

grant execute on function public.get_ai_practice_progress(text) to authenticated;

-- =============================================================================
-- Aspirant: start session
-- =============================================================================

create or replace function public.start_ai_practice_session(
  p_track text,
  p_level smallint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_plan text;
  v_started_at timestamptz;
  v_track text := lower(trim(coalesce(p_track, '')));
  v_status text;
  v_session_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  if v_track = '' then
    return jsonb_build_object('ok', false, 'error', 'Track is required');
  end if;

  if p_level is null or p_level < 1 or p_level > 3 then
    return jsonb_build_object('ok', false, 'error', 'Level must be 1, 2, or 3');
  end if;

  select a.plan, a.plan_started_at into v_plan, v_started_at
  from public.aspirants a
  where a.id = v_uid;

  if v_plan is null then
    return jsonb_build_object('ok', false, 'error', 'Aspirant profile not found');
  end if;

  if not public.is_subscription_active(v_plan, v_started_at) then
    return jsonb_build_object('ok', false, 'error', 'Active subscription required for AI Practice');
  end if;

  perform public.ensure_ai_practice_track_progress(v_uid, v_track);

  select p.status into v_status
  from public.ai_practice_progress p
  where p.aspirant_id = v_uid and p.track = v_track and p.level = p_level;

  if v_status is null then
    return jsonb_build_object('ok', false, 'error', 'Progress row missing');
  end if;

  if v_status = 'locked' then
    return jsonb_build_object('ok', false, 'error', 'This level is locked. Clear the previous level first (70%+).');
  end if;

  if v_status not in ('available', 'passed') then
    return jsonb_build_object('ok', false, 'error', 'Level is not available');
  end if;

  update public.ai_practice_sessions s
  set status = 'abandoned', ended_at = coalesce(s.ended_at, now())
  where s.aspirant_id = v_uid and s.status = 'in_progress';

  insert into public.ai_practice_sessions (aspirant_id, track, level, status)
  values (v_uid, v_track, p_level, 'in_progress')
  returning id into v_session_id;

  return jsonb_build_object(
    'ok', true,
    'session_id', v_session_id,
    'track', v_track,
    'level', p_level
  );
end;
$$;

comment on function public.start_ai_practice_session(text, smallint) is
  'Paid aspirants only. Creates in_progress session if level is available or already passed.';

grant execute on function public.start_ai_practice_session(text, smallint) to authenticated;

-- =============================================================================
-- Aspirant: complete session (save transcript → evaluating)
-- =============================================================================

create or replace function public.complete_ai_practice_session(
  p_session_id uuid,
  p_transcript text,
  p_duration_seconds int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.ai_practice_sessions%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  if p_session_id is null then
    return jsonb_build_object('ok', false, 'error', 'Session id required');
  end if;

  select * into v_row
  from public.ai_practice_sessions s
  where s.id = p_session_id and s.aspirant_id = v_uid
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Session not found');
  end if;

  if v_row.status <> 'in_progress' then
    return jsonb_build_object('ok', false, 'error', 'Session is not in progress');
  end if;

  update public.ai_practice_sessions
  set
    status = 'evaluating',
    transcript = nullif(trim(coalesce(p_transcript, '')), ''),
    duration_seconds = case
      when p_duration_seconds is null or p_duration_seconds < 0 then null
      else p_duration_seconds
    end,
    ended_at = now()
  where id = p_session_id;

  return jsonb_build_object(
    'ok', true,
    'session_id', p_session_id,
    'status', 'evaluating'
  );
end;
$$;

comment on function public.complete_ai_practice_session(uuid, text, int) is
  'Saves transcript and marks session evaluating before edge function scores it.';

grant execute on function public.complete_ai_practice_session(uuid, text, int) to authenticated;

-- =============================================================================
-- Save evaluation (≥70% → pass + unlock next level)
-- =============================================================================

create or replace function public.save_ai_practice_evaluation(
  p_session_id uuid,
  p_overall_percent numeric,
  p_passed boolean,
  p_area_scores jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.ai_practice_sessions%rowtype;
  v_passed boolean;
  v_percent numeric(5,2);
  v_unlocked smallint := null;
  v_next_status text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  if p_session_id is null then
    return jsonb_build_object('ok', false, 'error', 'Session id required');
  end if;

  if p_overall_percent is null or p_overall_percent < 0 or p_overall_percent > 100 then
    return jsonb_build_object('ok', false, 'error', 'overall_percent must be 0–100');
  end if;

  select * into v_row
  from public.ai_practice_sessions s
  where s.id = p_session_id and s.aspirant_id = v_uid
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Session not found');
  end if;

  if v_row.status not in ('evaluating', 'in_progress') then
    return jsonb_build_object('ok', false, 'error', 'Session cannot be evaluated in current status');
  end if;

  v_percent := round(p_overall_percent::numeric, 2);
  -- Server-side pass rule: ≥ 70%
  if v_percent >= 70 then
    v_passed := true;
  else
    v_passed := false;
  end if;

  update public.ai_practice_sessions
  set
    status = 'completed',
    overall_percent = v_percent,
    passed = v_passed,
    area_scores = coalesce(p_area_scores, '[]'::jsonb),
    ended_at = coalesce(ended_at, now())
  where id = p_session_id;

  perform public.ensure_ai_practice_track_progress(v_uid, v_row.track);

  update public.ai_practice_progress
  set attempts = attempts + 1
  where aspirant_id = v_uid and track = v_row.track and level = v_row.level;

  if v_passed then
    update public.ai_practice_progress
    set
      status = 'passed',
      best_percent = greatest(coalesce(best_percent, 0), v_percent),
      passed_at = coalesce(passed_at, now())
    where aspirant_id = v_uid and track = v_row.track and level = v_row.level;

    if v_row.level < 3 then
      select p.status into v_next_status
      from public.ai_practice_progress p
      where p.aspirant_id = v_uid and p.track = v_row.track and p.level = v_row.level + 1;

      if v_next_status = 'locked' then
        update public.ai_practice_progress
        set status = 'available'
        where aspirant_id = v_uid and track = v_row.track and level = v_row.level + 1;
        v_unlocked := v_row.level + 1;
      elsif v_next_status in ('available', 'passed') then
        v_unlocked := v_row.level + 1;
      end if;
    end if;
  else
    update public.ai_practice_progress
    set best_percent = case
      when best_percent is null or v_percent > best_percent then v_percent
      else best_percent
    end
    where aspirant_id = v_uid and track = v_row.track and level = v_row.level
      and status in ('available', 'passed');
  end if;

  return jsonb_build_object(
    'ok', true,
    'session_id', p_session_id,
    'passed', v_passed,
    'overall_percent', v_percent,
    'unlocked_level', v_unlocked,
    'track_completed', (
      select count(*) = 3
      from public.ai_practice_progress p
      where p.aspirant_id = v_uid and p.track = v_row.track and p.status = 'passed'
    )
  );
end;
$$;

comment on function public.save_ai_practice_evaluation(uuid, numeric, boolean, jsonb) is
  'Saves evaluation. Pass requires ≥70%. Unlocks next level when newly passed.';

grant execute on function public.save_ai_practice_evaluation(uuid, numeric, boolean, jsonb) to authenticated;

-- =============================================================================
-- Attach api_key_id to session (edge function after picking a key)
-- =============================================================================

create or replace function public.attach_ai_practice_session_key(
  p_session_id uuid,
  p_api_key_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  update public.ai_practice_sessions
  set api_key_id = p_api_key_id
  where id = p_session_id
    and aspirant_id = v_uid
    and status = 'in_progress';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Session not found or not in progress');
  end if;

  update public.ai_gemini_api_keys
  set
    usage_count = usage_count + 1,
    last_used_at = now()
  where id = p_api_key_id and is_active = true;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.attach_ai_practice_session_key(uuid, uuid) to authenticated;

-- =============================================================================
-- Admin: API key CRUD (masked list)
-- =============================================================================

create or replace function public.admin_list_ai_gemini_keys()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Admin only');
  end if;

  return jsonb_build_object(
    'ok', true,
    'keys', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', k.id,
          'label', k.label,
          'masked_key', public.ai_practice_mask_api_key(k.api_key),
          'is_active', k.is_active,
          'priority', k.priority,
          'usage_count', k.usage_count,
          'error_count', k.error_count,
          'last_used_at', k.last_used_at,
          'last_error_at', k.last_error_at,
          'created_at', k.created_at
        )
        order by k.priority desc, k.created_at desc
      )
      from public.ai_gemini_api_keys k
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.admin_list_ai_gemini_keys() to authenticated;

create or replace function public.admin_add_ai_gemini_key(
  p_label text,
  p_api_key text,
  p_priority int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_label text := trim(coalesce(p_label, ''));
  v_key text := trim(coalesce(p_api_key, ''));
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Admin only');
  end if;

  if v_label = '' then
    return jsonb_build_object('ok', false, 'error', 'Label is required');
  end if;

  if char_length(v_key) < 10 then
    return jsonb_build_object('ok', false, 'error', 'API key looks invalid');
  end if;

  insert into public.ai_gemini_api_keys (label, api_key, priority)
  values (v_label, v_key, coalesce(p_priority, 0))
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'id', v_id,
    'masked_key', public.ai_practice_mask_api_key(v_key)
  );
end;
$$;

grant execute on function public.admin_add_ai_gemini_key(text, text, int) to authenticated;

create or replace function public.admin_set_ai_gemini_key_active(
  p_id uuid,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Admin only');
  end if;

  if p_id is null or p_is_active is null then
    return jsonb_build_object('ok', false, 'error', 'id and is_active required');
  end if;

  update public.ai_gemini_api_keys
  set is_active = p_is_active
  where id = p_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Key not found');
  end if;

  return jsonb_build_object('ok', true, 'id', p_id, 'is_active', p_is_active);
end;
$$;

grant execute on function public.admin_set_ai_gemini_key_active(uuid, boolean) to authenticated;

create or replace function public.admin_delete_ai_gemini_key(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Admin only');
  end if;

  if p_id is null then
    return jsonb_build_object('ok', false, 'error', 'id required');
  end if;

  delete from public.ai_gemini_api_keys where id = p_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Key not found');
  end if;

  return jsonb_build_object('ok', true, 'id', p_id);
end;
$$;

grant execute on function public.admin_delete_ai_gemini_key(uuid) to authenticated;

-- =============================================================================
-- Admin: analytics (single AI Practice page)
-- =============================================================================

create or replace function public.get_ai_practice_analytics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total bigint;
  v_completed bigint;
  v_passed bigint;
  v_today bigint;
  v_week bigint;
  v_active_keys int;
  v_keys jsonb;
  v_tracks jsonb;
  v_levels jsonb;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Admin only');
  end if;

  select count(*) into v_total from public.ai_practice_sessions;

  select count(*) into v_completed
  from public.ai_practice_sessions
  where status = 'completed';

  select count(*) into v_passed
  from public.ai_practice_sessions
  where status = 'completed' and passed = true;

  select count(*) into v_today
  from public.ai_practice_sessions
  where started_at >= date_trunc('day', now() at time zone 'Asia/Kolkata')
    at time zone 'Asia/Kolkata';

  select count(*) into v_week
  from public.ai_practice_sessions
  where started_at >= now() - interval '7 days';

  select count(*)::int into v_active_keys
  from public.ai_gemini_api_keys
  where is_active = true;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', k.id,
      'label', k.label,
      'masked_key', public.ai_practice_mask_api_key(k.api_key),
      'is_active', k.is_active,
      'usage_count', k.usage_count,
      'error_count', k.error_count,
      'last_used_at', k.last_used_at
    )
    order by k.usage_count desc, k.label
  ), '[]'::jsonb)
  into v_keys
  from public.ai_gemini_api_keys k;

  select coalesce(jsonb_agg(row_data order by sessions desc), '[]'::jsonb)
  into v_tracks
  from (
    select jsonb_build_object(
      'track', s.track,
      'sessions', count(*),
      'completed', count(*) filter (where s.status = 'completed'),
      'passed', count(*) filter (where s.passed = true)
    ) as row_data,
    count(*) as sessions
    from public.ai_practice_sessions s
    group by s.track
  ) t;

  select coalesce(jsonb_agg(row_data order by level), '[]'::jsonb)
  into v_levels
  from (
    select jsonb_build_object(
      'level', s.level,
      'sessions', count(*),
      'passed', count(*) filter (where s.passed = true),
      'pass_rate', case
        when count(*) filter (where s.status = 'completed') = 0 then null
        else round(
          (100.0 * count(*) filter (where s.passed = true))
          / nullif(count(*) filter (where s.status = 'completed'), 0),
          1
        )
      end
    ) as row_data,
    s.level
    from public.ai_practice_sessions s
    group by s.level
  ) t;

  return jsonb_build_object(
    'ok', true,
    'totals', jsonb_build_object(
      'sessions', v_total,
      'completed', v_completed,
      'passed', v_passed,
      'pass_rate', case
        when v_completed = 0 then null
        else round((100.0 * v_passed) / v_completed, 1)
      end,
      'today', v_today,
      'last_7_days', v_week,
      'active_keys', v_active_keys
    ),
    'keys', v_keys,
    'tracks', v_tracks,
    'levels', v_levels
  );
end;
$$;

comment on function public.get_ai_practice_analytics() is
  'Admin AI Practice dashboard: session totals, pass rate, key usage, track/level stats.';

grant execute on function public.get_ai_practice_analytics() to authenticated;

-- =============================================================================
-- Service-role helpers for edge functions (pick key / mark key error)
-- =============================================================================

create or replace function public.pick_ai_gemini_api_key()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.ai_gemini_api_keys%rowtype;
begin
  if auth.role() <> 'service_role' and not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed');
  end if;

  select * into v_row
  from public.ai_gemini_api_keys k
  where k.is_active = true
  order by k.priority desc, k.last_used_at asc nulls first, k.created_at asc
  limit 1
  for update skip locked;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'No active Gemini API keys');
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', v_row.id,
    'api_key', v_row.api_key,
    'label', v_row.label
  );
end;
$$;

comment on function public.pick_ai_gemini_api_key() is
  'Returns one active Gemini key (full secret). service_role or admin only.';

create or replace function public.mark_ai_gemini_api_key_error(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed');
  end if;

  update public.ai_gemini_api_keys
  set
    error_count = error_count + 1,
    last_error_at = now()
  where id = p_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Key not found');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;
