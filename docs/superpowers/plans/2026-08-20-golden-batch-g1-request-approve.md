# Golden Batch G1 — Request & Staff Approve Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Free course members can request Golden access; admin or interviewer can approve/reject; approved members enter `awaiting_payment` (payment UI deferred to G3).

**Architecture:** Extend `course_members` status + `access_state` via migration `133`; SECURITY DEFINER RPCs for aspirant request and staff review; thin UI on aspirant enrolled course page, admin course detail tab, and interviewer courses page.

**Tech Stack:** React/Vite, Supabase migrations/RPCs, existing `is_ops_admin()` / `is_admin()` / interviewer role checks (match live-classes staff pattern).

**Spec:** `docs/superpowers/specs/2026-08-20-golden-batch-payments-design.md`

## Global Constraints

- Aspirant UI: prefer “Golden access” / course title; avoid casual “batch” except existing marketing “Golden Batch” CTA if already used
- Free join review stays **ops admin only**; Golden **enroll** review = ops admin **or** interviewer
- Payment / packs / UPI **out of scope** for G1 — after approve show waiting-for-payment copy only
- Do not change placement `payment_orders`
- Interviewers must not get free-join approve via this work

---

## File map

| Area | Files |
|------|--------|
| DB | `supabase/migrations/133_course_golden_request.sql` |
| Lib | `src/lib/courses.js` — wrappers for new RPCs; extend list/membership parsing |
| Aspirant | `src/components/courses/EnrolledCourseBoard.jsx` and/or `CoursesPage.jsx` — request CTA + status |
| Admin | `src/pages/admin/courses/AdminCourseDetailPage.jsx` — Golden requests tab |
| Interviewer | `src/pages/interviewer/InterviewerCoursesPage.jsx` (+ small panel component if cleaner) |

---

## Task 1: Migration — schema + RPCs

**Files:** `supabase/migrations/133_course_golden_request.sql`

- [ ] Expand `course_members_status_check` to include `golden_requested`, `golden`, `golden_rejected` (keep existing + `golden` from 132)
- [ ] Add columns: `access_state` (default `none`), `golden_requested_at`, `golden_request_reason`, `golden_reviewed_by`, `golden_reviewed_at`, `chosen_pack`, `next_due_at`, `installments_paid` (default 0), `installments_total` (nullable)
- [ ] Check constraint on `access_state` in (`none`, `awaiting_payment`, `active`, `paused`, `completed`)
- [ ] Backfill: existing `free` → `access_state = none`; existing `golden` if any → `access_state = active` (safe default)
- [ ] `request_course_golden(p_course_id uuid, p_reason text default null)` — auth required; member must be `free` or `golden_rejected`; set `golden_requested`, reason trim ≤500, clear reject fields as needed
- [ ] Helper or inline: staff = `is_ops_admin() OR` interviewer (same pattern as `staff_list_course_classes` / live class staff RPCs — **read existing staff check and reuse**)
- [ ] `staff_list_course_golden_requests(p_course_id uuid)` — pending `golden_requested` with aspirant name/email/reason/profile id
- [ ] `staff_review_course_golden(p_member_id uuid, p_approve boolean)` — approve → `status=golden`, `access_state=awaiting_payment`, set reviewed_*; reject → `status=golden_rejected`, `access_state=none`
- [ ] Extend `list_active_courses` (or membership fields already returned) so aspirant UI sees `membership_status`, `access_state`, and enough to show CTA
- [ ] Grants: `execute` to `authenticated`
- [ ] Apply on DEV with `supabase db push` (link DEV)

**Done when:** SQL applied on DEV; manual RPC smoke: free user request → staff approve → status golden + awaiting_payment.

---

## Task 2: Lib wrappers

**Files:** `src/lib/courses.js`

- [ ] `requestCourseGolden(courseId, reason)`
- [ ] `staffListCourseGoldenRequests(courseId)`
- [ ] `staffReviewCourseGolden(memberId, approve)`
- [ ] Ensure course list / membership helpers expose `access_state` if returned by RPC

**Done when:** Wrappers call new RPCs and use existing `parseRpc` pattern.

---

## Task 3: Aspirant UI

**Files:** enrolled course board / courses page (wherever free member sees enrolled state)

- [ ] If `free`: button **Request Golden access** + optional reason modal (≤500)
- [ ] If `golden_requested`: pending message
- [ ] If `golden_rejected`: short message + allow request again
- [ ] If `golden` + `awaiting_payment`: message that payment opens soon / “Approved — payment step coming” (no fake pay form)
- [ ] If `golden` + `active`/`paused`/`completed`: badge only for now (or minimal copy)

**Done when:** Free aspirant can request; states render correctly after refresh.

---

## Task 4: Admin UI — Golden requests tab

**Files:** `src/pages/admin/courses/AdminCourseDetailPage.jsx`

- [ ] Add tab **Golden** (or “Golden requests”) next to invites/requests/members
- [ ] List pending golden requests (name, email, reason, open profile if pattern exists)
- [ ] Approve / Reject calling `staffReviewCourseGolden`
- [ ] Refresh counts after action

**Done when:** Ops admin can approve/reject from course detail.

---

## Task 5: Interviewer UI

**Files:** `src/pages/interviewer/InterviewerCoursesPage.jsx` (+ optional `CourseGoldenRequestsPanel.jsx`)

- [ ] For selected course, show Golden requests list + approve/reject
- [ ] Reuse same staff RPCs (not admin-only free-join RPCs)

**Done when:** Interviewer can approve a golden request end-to-end.

---

## Task 6: Smoke checklist

- [ ] Free join still admin-only; interviewer cannot approve free join via accidental reuse
- [ ] Free → golden_requested → approve → awaiting_payment
- [ ] Reject → golden_rejected → re-request works
- [ ] Interviewer approve works on DEV
- [ ] Push migration to prod only when user asks

---

## Deferred (not this plan)

G2 pricing, G3–G5 payments/pause/reminders, G6 lock flip, G7 reports, Gold plan grant on payment.
