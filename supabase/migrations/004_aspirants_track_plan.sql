-- Add track and plan to aspirants (same Base/Silver/Gold for both tracks).
-- Run after 001_profiles.sql.

alter table public.aspirants
  add column if not exists track text,
  add column if not exists plan text;

comment on column public.aspirants.track is 'fresher | experienced';
comment on column public.aspirants.plan is 'base | silver | gold';
