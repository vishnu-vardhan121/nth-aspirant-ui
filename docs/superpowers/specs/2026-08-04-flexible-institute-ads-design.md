# Flexible promo popups (extend `institute_ads`)

**Date:** 2026-08-04  
**Status:** Implemented (2026-08-04)  
**Decision:** Extend existing `institute_ads` + clean up modal mess (Approach A). Do **not** create a new ads product/table.

---

## Why Approach A (not B/C)

Current code is a thin stack:

| Piece | Role today |
|-------|------------|
| `institute_ads` | name, image, link, one `is_active` |
| `AdminInstituteAdsPage` | simple form + table |
| `LandingPage` | fetch active → open modal after delay+scroll |
| `InstituteAdModal` | image ad **or** hardcoded “Promote with NTH / email” fallback |

**Mess to remove (not grow):**

- Fallback promo card (~100 lines) when no active ad
- Landing **always** opens the modal (`ad: activeAd ?? { isFallback: true }`)
- “Email us” chip on top of real poster ads
- Dismiss localStorage only for that old fallback

JSON audiences (B) or a targeting join table (C) add complexity this admin page does not need. Boolean audience columns match how the rest of NTH stores plan flags and keep RLS/selects simple.

---

## Product rules

### Content (render by what’s filled)

| Filled | UI |
|--------|----|
| Text only (`title` / `body_text`) | Notice-style card |
| Image only | Poster (current large image) |
| `link_url` set | **Click here** button (and/or image click — prefer explicit button when text present) |
| Mix | Combine the pieces above |

- Require **at least one** of: text (title or body) **or** image  
- Image becomes **optional** (today it is required)  
- Keep `institute_name` as internal/admin label (or rename label in UI to “Promo name”)

### Audience (multi-select checkboxes)

Show if **any** selected flag matches the viewer:

| Flag | Meaning |
|------|---------|
| `audience_all` | Landing visitors + all aspirants |
| `audience_ai_ml` | Aspirant in free/enrolled AI-ML course |
| `audience_base` | Active Base plan |
| `audience_silver` | Active Silver plan |
| `audience_gold` | Active Gold plan |

- Multiple flags OK; “all checkboxes” OK  
- Landing (logged out): only ads with `audience_all`  
- Dashboard: ads where `audience_all` **or** plan matches **or** AI-ML membership matches  

### Active ads

- Keep **one active popup at a time per surface** for v1 (same as today’s trigger), **or** pick newest matching `is_active` if multiple allowed later  
- **Recommended v1:** allow multiple `is_active` rows; client picks **one** highest-priority match (`priority` int, default 0; then `updated_at`). Drop “only one can be active” trigger when we need Golden Batch + plan notice coexistence — **or** keep one-active until dashboard lands.  
- **Locked for first ship:** keep existing one-active trigger on landing; dashboard can reuse same row with audience flags. Revisit multi-active only if needed.

### Surfaces

1. Landing — existing delay + scroll gate; **no popup if no matching ad**  
2. Dashboard — same modal component later; gate on aspirant profile/plan/course membership  

---

## Schema changes (migration on `institute_ads`)

Add (all nullable/default-safe):

```text
title            text
body_text        text
audience_all     boolean not null default true   -- existing ads behave like “all”
audience_ai_ml   boolean not null default false
audience_base    boolean not null default false
audience_silver  boolean not null default false
audience_gold    boolean not null default false
priority         integer not null default 0      -- optional; useful if multi-active later
```

Alter:

```text
image_url  — drop NOT NULL (or allow empty string → treat as null in app)
```

No new table. Storage bucket `institute-ads` stays.

---

## Frontend cleanup

1. **`InstituteAdModal`**  
   - Delete fallback branch, mailto chip, `ADS_CONTACT_EMAIL` usage in this modal, `isFallback`, don’t-show-again for promo  
   - Render: notice / image / Click here from props  

2. **`LandingPage`**  
   - Fetch active ad(s) with audience columns  
   - Open modal **only if** a matching ad exists  
   - Remove `{ isFallback: true }` path and dismiss-key logic tied to fallback  

3. **`AdminInstituteAdsPage`**  
   - Fields: name, title, body, image (optional), link, audience checkboxes, active  
   - Image not required if text present  

4. **Shared helper (small)** e.g. `src/lib/promoAds.js`  
   - `adMatchesViewer(ad, { isLanding, plan, hasAiMl })`  
   - `pickPromoAd(ads, viewer)`  
   Keeps Landing + Dashboard from duplicating filter logic  

5. **Leave alone:** `landing_institute_spotlight` / Best Institute section (different feature)

---

## Out of scope (later)

- Schedule start/end dates  
- Analytics / impressions  
- Multiple simultaneous popups stacked  
- Renaming table to `promo_ads` (optional cleanup rename only if we want clearer admin copy)

---

## Build order (when we implement)

1. Migration + RLS unchanged for public `is_active` select (filter audiences in client, or add RPC later)  
2. Strip modal fallback / email clutter  
3. Admin form fields + optional image  
4. Landing match + render modes  
5. Dashboard hook-up  

---

## Success criteria

- Admin can push Golden Batch (image + Click here + All) without code changes  
- Text-only notice works for Base/Silver/Gold / AI-ML audiences  
- No email / “Promote with NTH” popup when there is no ad  
- No new parallel ads system in the repo  
