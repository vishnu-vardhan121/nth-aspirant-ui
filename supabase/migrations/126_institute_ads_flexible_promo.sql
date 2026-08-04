-- Flexible promo fields on institute_ads (text / image / link + audience flags).
-- Keeps one-active trigger from 052. Existing rows get audience_all = true.

alter table public.institute_ads
  alter column image_url drop not null;

alter table public.institute_ads
  add column if not exists title text,
  add column if not exists body_text text,
  add column if not exists audience_all boolean not null default true,
  add column if not exists audience_ai_ml boolean not null default false,
  add column if not exists audience_base boolean not null default false,
  add column if not exists audience_silver boolean not null default false,
  add column if not exists audience_gold boolean not null default false,
  add column if not exists priority integer not null default 0;

comment on column public.institute_ads.title is 'Optional notice / promo title shown in popup.';
comment on column public.institute_ads.body_text is 'Optional notice body text.';
comment on column public.institute_ads.audience_all is 'Show on landing and to all aspirants.';
comment on column public.institute_ads.audience_ai_ml is 'Show to aspirants enrolled (free) in an active course.';
comment on column public.institute_ads.audience_base is 'Show to active Base plan aspirants.';
comment on column public.institute_ads.audience_silver is 'Show to active Silver plan aspirants.';
comment on column public.institute_ads.audience_gold is 'Show to active Gold plan aspirants.';
comment on column public.institute_ads.priority is 'Higher wins when multiple active rows are allowed later.';

-- Normalize empty image strings to null
update public.institute_ads
set image_url = null
where image_url is not null and btrim(image_url) = '';
