-- AI Practice: schema (API keys, sessions with transcripts, track/level progress).
-- Run after aspirants (001), admins/is_admin (002), subscription helpers (076+).
-- RPCs and admin analytics are added in 119_ai_practice_rpcs.sql.

-- =============================================================================
-- 1) Gemini API key pool (admin-managed; never exposed to aspirants)
-- =============================================================================

create table if not exists public.ai_gemini_api_keys (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  api_key text not null,
  is_active boolean not null default true,
  priority int not null default 0,
  usage_count bigint not null default 0,
  error_count int not null default 0,
  last_used_at timestamptz,
  last_error_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_gemini_api_keys_label_nonempty check (char_length(trim(label)) > 0),
  constraint ai_gemini_api_keys_api_key_nonempty check (char_length(trim(api_key)) > 0)
);

comment on table public.ai_gemini_api_keys is
  'Pool of Gemini API keys for AI Practice voice sessions. Managed by admins; read by edge functions via service role.';

create index if not exists ai_gemini_api_keys_active_priority_idx
  on public.ai_gemini_api_keys (is_active, priority desc, last_used_at asc nulls first);

alter table public.ai_gemini_api_keys enable row level security;

drop policy if exists "ai_gemini_api_keys_no_direct" on public.ai_gemini_api_keys;
create policy "ai_gemini_api_keys_no_direct"
  on public.ai_gemini_api_keys for all
  using (false)
  with check (false);

drop trigger if exists ai_gemini_api_keys_set_updated_at on public.ai_gemini_api_keys;
create trigger ai_gemini_api_keys_set_updated_at
  before update on public.ai_gemini_api_keys
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 2) Practice sessions (transcript + evaluation results)
-- =============================================================================

create table if not exists public.ai_practice_sessions (
  id uuid primary key default gen_random_uuid(),
  aspirant_id uuid not null references public.aspirants(id) on delete cascade,
  track text not null,
  level smallint not null,
  status text not null default 'in_progress',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds int,
  transcript text,
  api_key_id uuid references public.ai_gemini_api_keys(id) on delete set null,
  overall_percent numeric(5,2),
  passed boolean,
  area_scores jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_practice_sessions_level_range check (level between 1 and 3),
  constraint ai_practice_sessions_status_valid check (
    status in ('in_progress', 'evaluating', 'completed', 'abandoned')
  ),
  constraint ai_practice_sessions_track_nonempty check (char_length(trim(track)) > 0),
  constraint ai_practice_sessions_duration_nonneg check (
    duration_seconds is null or duration_seconds >= 0
  ),
  constraint ai_practice_sessions_overall_percent_range check (
    overall_percent is null or (overall_percent >= 0 and overall_percent <= 100)
  )
);

comment on table public.ai_practice_sessions is
  'One AI Practice voice attempt. Transcript saved on end; evaluation sets overall_percent and passed.';

comment on column public.ai_practice_sessions.transcript is
  'Full conversation text collected during the voice session; used for post-session rubric evaluation.';

comment on column public.ai_practice_sessions.area_scores is
  'JSON array of per-topic rubric scores from evaluation, e.g. [{ "name": "HTML", "score": 2, "note": "..." }].';

create index if not exists ai_practice_sessions_aspirant_track_level_idx
  on public.ai_practice_sessions (aspirant_id, track, level, started_at desc);

create index if not exists ai_practice_sessions_status_idx
  on public.ai_practice_sessions (status, started_at desc);

create index if not exists ai_practice_sessions_api_key_idx
  on public.ai_practice_sessions (api_key_id)
  where api_key_id is not null;

alter table public.ai_practice_sessions enable row level security;

drop policy if exists "ai_practice_sessions_select_own" on public.ai_practice_sessions;
create policy "ai_practice_sessions_select_own"
  on public.ai_practice_sessions for select to authenticated
  using (aspirant_id = auth.uid());

drop policy if exists "ai_practice_sessions_admin_select" on public.ai_practice_sessions;
create policy "ai_practice_sessions_admin_select"
  on public.ai_practice_sessions for select to authenticated
  using (public.is_admin());

-- Inserts/updates only via SECURITY DEFINER RPCs and edge functions (service role).
drop policy if exists "ai_practice_sessions_no_direct_write" on public.ai_practice_sessions;
create policy "ai_practice_sessions_no_direct_write"
  on public.ai_practice_sessions for insert to authenticated
  with check (false);

drop policy if exists "ai_practice_sessions_no_direct_update" on public.ai_practice_sessions;
create policy "ai_practice_sessions_no_direct_update"
  on public.ai_practice_sessions for update to authenticated
  using (false)
  with check (false);

drop trigger if exists ai_practice_sessions_set_updated_at on public.ai_practice_sessions;
create trigger ai_practice_sessions_set_updated_at
  before update on public.ai_practice_sessions
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 3) Track / level progress (locked → available → passed)
-- =============================================================================

create table if not exists public.ai_practice_progress (
  aspirant_id uuid not null references public.aspirants(id) on delete cascade,
  track text not null,
  level smallint not null,
  status text not null default 'locked',
  best_percent numeric(5,2),
  passed_at timestamptz,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (aspirant_id, track, level),
  constraint ai_practice_progress_level_range check (level between 1 and 3),
  constraint ai_practice_progress_status_valid check (
    status in ('locked', 'available', 'passed')
  ),
  constraint ai_practice_progress_track_nonempty check (char_length(trim(track)) > 0),
  constraint ai_practice_progress_attempts_nonneg check (attempts >= 0),
  constraint ai_practice_progress_best_percent_range check (
    best_percent is null or (best_percent >= 0 and best_percent <= 100)
  )
);

comment on table public.ai_practice_progress is
  'Per-aspirant progress on AI Practice tracks. Level 1 becomes available on first visit; level N+1 unlocks when level N passes (≥70%).';

create index if not exists ai_practice_progress_aspirant_track_idx
  on public.ai_practice_progress (aspirant_id, track, level);

alter table public.ai_practice_progress enable row level security;

drop policy if exists "ai_practice_progress_select_own" on public.ai_practice_progress;
create policy "ai_practice_progress_select_own"
  on public.ai_practice_progress for select to authenticated
  using (aspirant_id = auth.uid());

drop policy if exists "ai_practice_progress_admin_select" on public.ai_practice_progress;
create policy "ai_practice_progress_admin_select"
  on public.ai_practice_progress for select to authenticated
  using (public.is_admin());

drop policy if exists "ai_practice_progress_no_direct_write" on public.ai_practice_progress;
create policy "ai_practice_progress_no_direct_write"
  on public.ai_practice_progress for insert to authenticated
  with check (false);

drop policy if exists "ai_practice_progress_no_direct_update" on public.ai_practice_progress;
create policy "ai_practice_progress_no_direct_update"
  on public.ai_practice_progress for update to authenticated
  using (false)
  with check (false);

drop trigger if exists ai_practice_progress_set_updated_at on public.ai_practice_progress;
create trigger ai_practice_progress_set_updated_at
  before update on public.ai_practice_progress
  for each row execute function public.set_updated_at();
