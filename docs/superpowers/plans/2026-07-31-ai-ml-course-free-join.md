# AI/ML Course Free Join — Implementation Plan

> **For agentic workers:** Use task-by-task execution. Steps use checkbox syntax.

**Goal:** Admin creates courses and invite lists; aspirants join free (invite) or request + admin approve/reject.

**Architecture:** 3 Supabase tables + SECURITY DEFINER RPCs; thin React admin + aspirant pages. No course payments or classes.

**Tech Stack:** React/Vite NTH app, Supabase migrations/RPCs/RLS, existing `is_admin()` / aspirant auth gates.

**Spec:** `docs/superpowers/specs/2026-07-31-ai-ml-course-free-join-design.md`

## Global Constraints

- Aspirant UI never says “batch”
- Free-join review: **admin only** via `admin_review_course_join`
- No placement `payment_orders` changes
- Phase 1 only: join free

---

## File map

| Area | Files (expected) |
|------|------------------|
| DB | `supabase/migrations/124_ai_ml_course_free_join.sql` |
| Lib | `src/lib/courses.js` (RPC wrappers) |
| Admin | `src/pages/admin/courses/*` + route in `App.jsx` / admin nav |
| Aspirant | `src/pages/dashboard/courses/*` + route + dashboard nav |

---

## Task 1: Migration — tables + RLS

- [ ] Add `courses`, `course_invites`, `course_members`
- [ ] Indexes: course `code` unique; invites `(course_id, email)` unique; members `(course_id, aspirant_id)` unique
- [ ] Check constraint on `status` in (`requested`, `free`, `rejected`)
- [ ] RLS policies (select own / admin; writes via RPC preferred)
- [ ] Apply / verify on linked project

**Done when:** Tables exist; anon cannot insert members directly.

---

## Task 2: RPCs — aspirant join path

- [ ] `list_active_courses`
- [ ] `join_course_free(p_course_id)` — invite email match → `free`
- [ ] `request_course_join(p_course_id, p_reason)` — → `requested`
- [ ] `get_my_course_membership(p_course_id)` optional if covered by list

**Done when:** Invited user can join; others must request (SQL/manual test with service or SQL editor).

---

## Task 3: RPCs — admin

- [ ] `admin_create_course` / `admin_update_course`
- [ ] `admin_add_course_invites(p_course_id, p_emails text[])`
- [ ] `admin_list_course_join_requests` (status = requested) + list members
- [ ] `admin_review_course_join(p_member_id, p_approve boolean)` — **is_admin() only** → `free` or `rejected`

**Done when:** Admin can create course, add emails, approve/reject in SQL/RPC.

---

## Task 4: Admin UI

- [ ] Nav link “Courses” (or “AI/ML courses”)
- [ ] List + create course form
- [ ] Detail: bulk email textarea → invites
- [ ] Requests table: Approve / Reject calling `admin_review_course_join`

**Done when:** Full admin path works in browser.

---

## Task 5: Aspirant UI

- [ ] Dashboard entry: “AI/ML course”
- [ ] Course list from `list_active_courses`
- [ ] Join vs Request + reason
- [ ] Show pending / joined / rejected

**Done when:** Invited aspirant joins; non-invited requests; after admin approve, UI shows joined.

---

## Task 6: Smoke checklist

- [ ] Invite join → `free`
- [ ] Request → `requested` → admin reject → `rejected` → re-request allowed
- [ ] Request → approve → `free`
- [ ] Inactive course not listed / not joinable
- [ ] Non-admin cannot call `admin_review_course_join`

---

## Deferred

Classes, recordings, attendance, premium enroll, separate course UPI, Gold 6mo/12 mocks, installment block.
