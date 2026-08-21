# Course class session log (attendance + recording + topics)

**Date:** 2026-08-06  
**Status:** Approved for planning (v1 staff-only)  
**Related:** Live classes (`127_course_live_classes.sql`), Join email modal

## Problem

After a live Free Coding class, staff need to:

1. Save a **recording link** (same idea as 10k Coders post-class recording URL).
2. Capture **topics covered** (bullets).
3. Upload a Zoom **participants CSV**, match by **email** to enrolled (`free`) members, and mark attendance using a **min duration** chosen by the person uploading.

## Non-goals (v1)

- Aspirants do **not** see recording, topics, or attendance in the product UI yet.
- No automatic Zoom API sync — CSV upload only.
- No hard-coded global min-duration constant.

## Locked decisions

| Topic | Decision |
|-------|----------|
| Who can manage | Course staff = `is_course_staff()` (same as live classes: any `admins` row) |
| Visibility | Staff only until a later aspirant UI |
| Recording | Single URL field on the class (YouTube / Drive / Zoom cloud / etc.) |
| Topics | Free-text bullets; **at least 3** required when saving the session log |
| Match key | Email only (case-insensitive trim). Skip CSV rows with empty email |
| Duration column | Zoom **Total Duration (Minutes)** (header match flexible, case-insensitive) |
| Min duration | Integer minutes entered by the uploader for that save; stored on the class for that run |
| Re-upload | Replaces prior attendance rows for that class |
| Store duration | Always store each matched/unmatched row’s duration minutes for later analysis |

## Statuses (per CSV / member comparison)

| Status | Meaning |
|--------|---------|
| `attended` | Email matches a `free` `course_members` aspirant; duration ≥ min |
| `too_short` | Email matches; duration &lt; min |
| `not_in_batch` | Email in CSV but no free member with that email |
| `absent` | Free member with no CSV row (computed after upload; stored so staff see the list) |

Guests / blank emails: skipped (not stored).

## Data model (summary)

- Extend `course_classes`: `recording_url`, `covered_topics text[]`, `attendance_min_duration_minutes`, `session_logged_at`, `session_logged_by`.
- New `course_class_attendance`: one row per person considered after last upload (`class_id`, `aspirant_id` nullable, `email`, `duration_minutes`, `status`, timestamps, `uploaded_by`).

## Staff UX

From `CourseClassesManager` (admin course detail + interviewer courses): per class → **Manage session**.

Form sections:

1. Recording URL (required to save session).
2. Covered topics — dynamic list; validate ≥ 3 non-empty lines.
3. Min duration (minutes) — number input, default suggestion 30, staff can change.
4. Zoom participants CSV file input.
5. Preview summary + Save (persists topics/recording + replaces attendance).

## Email alignment

Join modal already warns aspirants to use their NTH-registered email on Zoom so CSV match works.

## Out of scope follow-ups

- Show recording + topics on aspirant class cards.
- Analytics dashboards / attendance % over batch.
- Parsing `Duration (HH:MM:SS)` column (v1 uses Total Duration minutes only).
