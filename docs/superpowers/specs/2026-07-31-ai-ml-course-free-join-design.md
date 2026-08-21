# AI/ML Course — Free Join (Phase 1) Design

**Status:** Approved for implementation (free join only)  
**Date:** 2026-07-31  
**App:** NTH aspirant UI only (10k Classes = future UI reference, not this phase)  
**Migration:** `supabase/migrations/124_ai_ml_course_free_join.sql` (renamed from 123 — main already uses 123 for placement)

## Goal

Let aspirants **join an AI/ML course for free**. Invited emails join directly; others request with a reason; **admin only** approves or rejects.

## Out of scope (later phases)

- Class upload, recordings, Meet management, attendance
- Premium enroll request, course payments (separate UPI), installments, content blocking
- Gold / 12 mocks grant
- Aspirant-facing word “batch” (never); admin may use internal codes like `aug-26`

## Future context (do not build now)

Full course later: demo vs premium classes, ₹38k full / ₹20k+₹20k installment, overdue blocks whole course, Gold 6 months + 12 mocks on first payment. Design tables so `course_members.status` can grow (`paid`, etc.).

---

## Data model — 3 tables

### 1. `courses`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid PK | |
| `code` | text | Internal, unique, e.g. `aug-26` |
| `title` | text | Aspirant-facing name |
| `free_starts_at` | timestamptz | nullable ok if unused in UI yet |
| `free_ends_at` | timestamptz | |
| `premium_starts_at` | timestamptz | nullable — reserved |
| `premium_ends_at` | timestamptz | nullable — reserved |
| `is_active` | boolean | default true; inactive = not joinable |
| `created_by` | uuid | admin |
| `created_at` / `updated_at` | timestamptz | |

### 2. `course_invites`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid PK | |
| `course_id` | uuid FK → courses | |
| `email` | text | store lowercased |
| `created_by` | uuid | admin |
| `created_at` | timestamptz | |
| unique | `(course_id, email)` | |

### 3. `course_members`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid PK | |
| `course_id` | uuid FK → courses | |
| `aspirant_id` | uuid FK → aspirants | |
| `status` | text | `requested` \| `free` \| `rejected` |
| `reason` | text | required when requesting |
| `reviewed_by` | uuid nullable | admin who decided |
| `reviewed_at` | timestamptz nullable | |
| `joined_at` | timestamptz nullable | set when status becomes `free` |
| `created_at` / `updated_at` | timestamptz | |
| unique | `(course_id, aspirant_id)` | |

Join request is **not** a fourth table: same row, `status = requested` → admin sets `free` or `rejected`.

---

## Access & RPCs

Pattern: SECURITY DEFINER RPCs + RLS (match existing NTH style). Use existing `is_admin()`.

### Aspirant

| RPC | Behavior |
|-----|----------|
| `list_active_courses()` | Active courses + caller's membership summary (no “batch” in API copy) |
| `join_course_free(p_course_id)` | If aspirant email (from auth/aspirants) is in `course_invites` for that course → upsert member `free`, set `joined_at`. Else error: must request. |
| `request_course_join(p_course_id, p_reason)` | Course active; not already `free`; upsert `requested` + reason. If already `rejected`, allow re-request (or block — prefer allow re-request). |
| `get_my_course_membership(p_course_id)` | Own row |

### Admin only

| RPC | Behavior |
|-----|----------|
| `admin_create_course(...)` | Insert course |
| `admin_update_course(...)` | Title, dates, `is_active`, etc. |
| `admin_add_course_invites(p_course_id, p_emails text[])` | Bulk insert ignore duplicates |
| `admin_list_course_invites` / members / requests | Lists for UI |
| **`admin_review_course_join(p_member_id, p_approve boolean)`** | **Admin only.** Approve → `status = free`, set `joined_at`, `reviewed_*`. Reject → `status = rejected`, set `reviewed_*`. |

Interviewer does **not** review free joins in this phase (admin only). Premium enroll approval by interviewer is a later phase.

### RLS (sketch)

- `courses`: authenticated can SELECT where `is_active` (or via RPC only)
- `course_invites`: admin only (no aspirant SELECT of full list; join checks inside RPC)
- `course_members`: aspirant SELECT own rows; admin SELECT all; writes via RPC

---

## UI

### Admin

- Courses list + create (code, title, free dates, active)
- Course detail: paste/bulk emails → invites
- Join requests: aspirant info + reason → Approve / Reject (`admin_review_course_join`)

### Aspirant

- Copy: **“AI/ML course”** / course `title` — never “batch”
- List active courses
- Invited → **Join**
- Not invited → **Request to join** + reason
- States: pending (`requested`), joined (`free`), rejected

---

## Email matching

Normalize invite and aspirant email to **lowercase trim**. Prefer matching `auth.users.email` (and aspirant contact email if stored) inside `join_course_free`.

---

## Success criteria

1. Admin creates course + uploads invite emails  
2. Invited logged-in aspirant joins → `course_members.status = free`  
3. Non-invited submits reason → `requested`  
4. Admin approve → `free`; reject → `rejected`  
5. No payment, classes, or Gold changes in this phase  
