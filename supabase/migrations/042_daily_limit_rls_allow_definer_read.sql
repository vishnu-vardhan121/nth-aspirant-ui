-- Allow SECURITY DEFINER functions (running as postgres/supabase_admin) to read site_settings,
-- signup_log, and pricing_leads so can_accept_registration_today(), submit_pricing_lead(), and
-- get_daily_signup_status() can enforce the daily lead limit.
-- When anon calls these functions, auth.uid() is null so is_admin() is false and the existing
-- policies block the read; the function then sees no rows and returns allowed=true.
--
-- IMPORTANT: Run this migration when ready (e.g. supabase db push or apply via dashboard).
-- Confirm with your team that migrations have been applied before relying on the new behaviour.

-- 1) site_settings: allow SELECT for the role that owns the function (typically postgres or supabase_admin)
drop policy if exists "site_settings_admin_all" on public.site_settings;
create policy "site_settings_admin_all"
  on public.site_settings for all
  using (
    public.is_admin()
    or current_user = 'postgres'
    or current_user = 'supabase_admin'
  )
  with check (
    public.is_admin()
    or current_user = 'postgres'
    or current_user = 'supabase_admin'
  );

-- 2) signup_log: allow SELECT and INSERT for same roles (for try_signup_slot / future signup use)
drop policy if exists "signup_log_no_direct" on public.signup_log;
create policy "signup_log_no_direct"
  on public.signup_log for all
  using (
    current_user = 'postgres'
    or current_user = 'supabase_admin'
  )
  with check (
    current_user = 'postgres'
    or current_user = 'supabase_admin'
  );

-- 3) pricing_leads: allow SELECT for same roles so definer can count today's leads (daily limit check)
drop policy if exists "pricing_leads_admin_select" on public.pricing_leads;
create policy "pricing_leads_admin_select"
  on public.pricing_leads for select
  using (
    public.is_admin()
    or current_user = 'postgres'
    or current_user = 'supabase_admin'
  );
