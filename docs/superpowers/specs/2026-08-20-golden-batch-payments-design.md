# Golden Batch — Request, Packs, Payments & Pause Design

**Status:** Draft for review  
**Date:** 2026-08-20  
**App:** NTH aspirant UI (admin + interviewer + aspirant)  
**Builds on:** Free join (`124`), live classes (`127`–`132`), watch/golden hooks (`132`)

## Goal

Let **free** course members request **Golden Batch**, get approved by **admin or interviewer**, choose an **admin-priced payment pack**, pay via **course-only UPI**, and after **admin verifies the first payment**, unlock Golden access. Later installments use **reminders** and **pause** (member stays in batch) until paid.

Aspirant copy never says “batch” except where product already uses “Golden Batch” as the paid tier name; prefer **course title** + “Golden access”.

## Locked product rules

| Rule | Decision |
|------|----------|
| Who requests Golden | Only members with `status = free` |
| Who approves Golden **enroll** | **Admin or interviewer** |
| Who verifies **payments** | **Admin only** |
| Packs | **3 types**, prices set **per course by admin**: (1) full one-shot (2) 2× with **1 month** gap (3) 3× with **1 month** gap |
| Access after payment 1 approved | **Golden active** — live join + recordings + golden-tier classes |
| Later installment overdue | **Pause** join + all recordings; **stay in course** (`golden` membership kept) |
| After overdue paid + admin approve | **Unpause** → active again |
| Course payments | **Separate** tables + **separate UPI** from placement `payment_orders`; **UTR + screenshot proof** required (same `payment-proofs` bucket pattern as Silver) |
| Premium links | Never return golden-tier meet/recording URLs to free or paused users (RPC-gated) |
| Gold plan grant | On **first** course payment approve: aspirant plan → **Gold**, **6 months**, **12 mocks** total, new enroll (`plan_started_at` reset) |
| Free join | Unchanged; still **admin only** |
| Course “Golden phase” flip | **Manual (admin):** toggle `recordings_locked_for_free` when premium starts for that course; tag new classes `access_tier = golden`. No auto-lock on payment or date. |

### Defaults (open items resolved)

| Topic | Default |
|-------|---------|
| Pause scope | Block **Join live** + **all recordings** (free-era + golden). Board cards/topics still visible. Doubt/feedback remain allowed. |
| Reminders (v1) | **In-app** banner + due card on course page; email optional later |
| Golden request reason | **Optional** short text (≤500 chars) |
| Pack change after choose | Allowed until **first payment approved**; changing pack cancels open pending/submitted course orders |
| Pause trigger | After **due date** end-of-day IST (not before first payment) |
| Golden request T&C | **Per course**; admin enters **bullet points** + show/hide; when shown, request opens **modal**, lists bullets, aspirant must tick **I agree** |

---

## End-to-end flow

```
Free member
  → Request Golden (± reason)
  → Staff (admin/interviewer) approve | reject
  → If approved: choose pack (full | 2× | 3×)
  → Pay installment 1 (course UPI) + submit for verification
  → Admin verifies amount + pack → approve
  → Member golden + access_state=active + Gold grant + schedule next due (if installment)
  → (Optional) installment 2 / 3 on +1 month gaps
  → Overdue → access_state=paused (still in batch)
  → Pay + admin approve → active again
  → Last installment paid → access_state=active (or completed flag)
```

---

## Data model

### Extend `course_members`

| Column | Type | Notes |
|--------|------|--------|
| `status` | text | Expand check: `requested`, `free`, `rejected`, `golden_requested`, `golden`, `golden_rejected` |
| `access_state` | text | `none` \| `awaiting_payment` \| `active` \| `paused` \| `completed`. Free members use `none`. |
| `golden_requested_at` | timestamptz | |
| `golden_request_reason` | text | optional |
| `golden_reviewed_by` | uuid | |
| `golden_reviewed_at` | timestamptz | |
| `chosen_pack` | text nullable | `full` \| `two` \| `three` — set when student commits to a pack |
| `next_due_at` | timestamptz nullable | next unpaid installment due (IST day) |
| `installments_paid` | int | default 0 |
| `installments_total` | int | 1, 2, or 3 after pack chosen |

**Status transitions**

| From | To | Who |
|------|-----|-----|
| `free` | `golden_requested` | aspirant |
| `golden_requested` | `free` + `golden_rejected` path | reject → status `golden_rejected` (or back to `free` with flag — prefer keep `golden_rejected` then allow re-request → `golden_requested`) |
| `golden_requested` | `golden` + `access_state=awaiting_payment` | staff approve enroll |
| `golden` + awaiting | stays `golden`, pack fields set | aspirant chooses pack |
| `golden` | `access_state=active` | admin approves payment 1 |
| `golden` + active | `paused` | job/RPC: overdue |
| `paused` | `active` | admin approves overdue installment |

Re-request after `golden_rejected`: allowed (same as free join pattern).

### New: `course_pricing` (1 row per course)

| Column | Notes |
|--------|--------|
| `course_id` | PK/FK |
| `full_amount_inr` | integer |
| `two_amounts_inr` | int[2] — installment amounts |
| `three_amounts_inr` | int[3] |
| `upi_id` | text — course UPI (not placement) |
| `upi_payee_name` | text |
| `instructions` | text nullable |
| `updated_at` / `updated_by` | |

Gap between installments is fixed **1 calendar month** from previous due / first payment approve date (store `next_due_at`).

### New: `course_payment_orders`

Separate from `payment_orders`.

| Column | Notes |
|--------|--------|
| `id` | uuid |
| `course_id`, `member_id`, `aspirant_id` | |
| `pack` | `full` \| `two` \| `three` |
| `installment_index` | 1..3 |
| `amount_inr` | |
| `status` | `pending` \| `approved` \| `rejected` |
| `upi_reference` / proof fields | mirror placement pattern as needed |
| `submitted_at`, `reviewed_by`, `reviewed_at`, `review_note` | |

One pending order max per member at a time (enforce in RPC).

### Existing hooks (already in `132`)

- `courses.recordings_locked_for_free`
- `course_classes.access_tier` (`free` \| `golden`)
- Watch / board RPCs already filter golden classes and recording URLs for free members when locked

Extend those RPCs so **`access_state = paused`** also denies playback and join link fetch (same as free under lock for URLs).

---

## Access matrix

| Actor | Free classes cards | Golden class rows in API | Play / Join |
|-------|--------------------|--------------------------|-------------|
| `free` (pre–phase flip) | Yes | No if tier=golden | Play yes until `recordings_locked_for_free` |
| `free` (after lock flip) | Yes (no recording URL) | No | No Play |
| `golden` + `awaiting_payment` | Yes | No | No Play / Join for golden content |
| `golden` + `active` | Yes | Yes | Yes |
| `golden` + `paused` | Yes | Prefer hide URLs / block fetch | **No** Play / Join |
| `golden` + `completed` | Yes | Yes | Yes |

---

## RPCs (by phase)

### G1 — Request & enroll approve (build first)

| RPC | Auth | Behavior |
|-----|------|----------|
| `request_course_golden(p_course_id, p_reason)` | aspirant | Must be `free`; → `golden_requested` |
| `staff_list_course_golden_requests(p_course_id)` | ops admin **or** interviewer | List pending |
| `staff_review_course_golden(p_member_id, p_approve)` | ops admin **or** interviewer | Approve → `golden` + `awaiting_payment`; reject → `golden_rejected` |
| Extend `list_active_courses` / membership payload | aspirant | Expose golden status + access_state |

### G2 — Pricing

| RPC | Auth |
|-----|------|
| `admin_upsert_course_pricing(...)` | ops admin |
| `get_my_course_pricing(p_course_id)` | golden awaiting/active/paused (read amounts) |

### G3 — First payment

| RPC | Auth |
|-----|------|
| `choose_course_pack(p_course_id, p_pack)` | aspirant golden awaiting |
| `create_course_payment_order(...)` | aspirant |
| `admin_list_course_payment_orders` / `admin_review_course_payment` | ops admin |
| On approve installment 1 | set active, installments_paid=1, next_due_at, grant Gold plan |

### G4–G5 — Installments, reminders, pause

| Mechanism | Behavior |
|-----------|----------|
| Due schedule | `next_due_at += 1 month` after each approve until total paid |
| Pause | Scheduled check or on board/watch RPC: if `now()::ist_date > next_due_at::ist_date` and unpaid → set `paused` |
| Unpause | Admin approve installment → `active`, bump paid count / next due |
| Reminder UI | If due within 7 days or overdue, show banner on enrolled course board |

### G6 — Phase flip (manual)

Admin toggles **Premium started — lock free Play** (`recordings_locked_for_free`) on the course detail page. Staff set class **Access = Free | Golden** on create/edit. No auto flip from payments or `premium_starts_at`.

---

## UI

### Aspirant (enrolled course)

| State | UI |
|-------|-----|
| `free` | CTA **Request Golden access** |
| `golden_requested` | Pending staff review |
| `golden_rejected` | Message + re-request |
| `awaiting_payment` | Choose pack → pay installment 1 |
| `active` | Golden badge; if installment pending, due date + pay CTA |
| `paused` | Clear **paused** banner + pay overdue installment |

### Admin course detail

- Tab **Golden requests** (approve/reject)  
- Tab **Pricing** (3 packs + UPI)  
- Tab **Course payments** (verify amount + pack)  
- Members show access_state  

### Interviewer courses page

- Section **Golden requests** for selected course (approve/reject only — no payment verify)

---

## Build phases

| Phase | Deliverable | Ship alone? |
|-------|-------------|-------------|
| **G1** | Request + staff approve/reject + aspirant states + placeholder “payment coming” after approve | Yes |
| **G2** | Admin course pricing (3 packs) + separate course UPI; aspirant pack preview when awaiting payment | Yes |
| **G3** | Pack choose + course UPI pay + admin verify #1 → active + Gold plan grant | Yes |
| **G4** | Installment 2/3 orders when due window opens | Yes |
| **G5** | Auto-pause on overdue + in-app reminder (7 days) + unpause on approve; Join/Play blocked while paused | Yes |
| **G6** | Flip locks for free users (manual admin toggle + class Free/Golden) | Yes |
| **G7** | Admin overdue / revenue lists | Optional |

**First implementation:** G1 only.

---

## Out of scope (this design / G1)

- Changing free-join rules  
- Automatic email/SMS reminders (v1 in-app only)  
- Interviewer payment approval  
- Gateway / Razorpay (UPI QR + manual admin verify only)  
- Changing placement `payment_orders`  

---

## Success criteria (full product)

1. Free member requests Golden → staff approve → awaiting payment  
2. Admin sets prices → student picks pack → pays → admin approves → active Golden  
3. Missed installment 2/3 → paused; still listed as golden member; no Play/Join URLs  
4. Pay overdue → unpaused  
5. Free users never receive golden-tier URLs in API responses  

## Success criteria (G1 only)

1. Free member can request Golden  
2. Admin and interviewer can approve/reject  
3. Approved member sees awaiting-payment state (pay UI deferred to G3)  
4. Rejected can re-request  
5. Free join path unchanged  
