# Plan: Lead → Contact → (Offline Payment) → Admin Creates Aspirant & Plan

No Azure Pay or payment integration. Admin collects leads, contacts users, receives payment offline, then creates the aspirant and assigns plan from the dashboard.

---

## Current state (what you already have)

| Piece | Status |
|-------|--------|
| **Pricing / lead form** | User picks plan, fills form → saved to `pricing_leads` |
| **Admin Leads page** | Admins see all leads (plan, track, name, email, contact, etc.) |
| **Aspirants** | Table has `track`, `plan`, `plan_started_at` (plan validity: base/silver 3 months, gold 5 months) |
| **Create Admin** | Super admin can create admins (Edge Function `create-admin`) |

---

## Target flow (step by step)

1. **User** fills the lead form on the pricing page (no login).
2. **Admin** sees the lead under **Admin → Leads**.
3. **Admin** contacts the user (email/phone) and collects payment **offline**.
4. **Admin** creates the aspirant from the dashboard: new auth user + aspirant profile with **plan** and **track**.
5. **Admin** shares login details with the user (email + temporary password); user logs in and uses the app with that plan.
6. **(Optional)** Admin can later change an existing aspirant’s plan or plan start date from the dashboard.

---

## Build plan (step-by-step)

### Phase 1: Lead status (optional but useful)

**Goal:** Track which leads are contacted / converted so you don’t lose context.

| Step | What | How |
|------|------|-----|
| 1.1 | Add columns to `pricing_leads` | Migration: `status` (e.g. `new` / `contacted` / `converted` / `rejected`), `admin_notes` (text), optionally `converted_aspirant_id` (uuid). |
| 1.2 | RPC for admin to update lead | e.g. `update_pricing_lead_status(lead_id, status, notes)` or direct update if you add an RLS policy for admins on `pricing_leads`. |
| 1.3 | UI on Admin Leads page | Per-row actions: “Mark contacted”, “Mark converted”, “Add note”. Optional: filter by status. |

**Outcome:** Admin can mark leads as contacted/converted and add notes, all from the same screen.

---

### Phase 2: Create aspirant from admin (core)

**Goal:** Admin creates the auth user and aspirant in one go, with plan and track.

| Step | What | How |
|------|------|-----|
| 2.1 | Edge Function `create-aspirant` | Same pattern as `create-admin`: only callable by admins (or super admins). Inputs: `email`, `password`, `full_name`, `track`, `plan`, optional `phone`, `city`, `education` (or minimal: name, email, password, track, plan). Function uses **service role** to: (1) `auth.admin.createUser(email, password, email_confirm: true)`, (2) insert into `aspirants` with `id = new user id`, `full_name`, `email`, `phone`, `city`, `track`, `plan`, `plan_started_at = now()`, `education = '{}'` etc. |
| 2.2 | Deploy function | `npx supabase functions deploy create-aspirant` (and add script in package.json like `deploy:create-aspirant`). |
| 2.3 | “Create Aspirant” in admin UI | New page or modal: form with email, password, full name, track (fresher/experienced), plan (base/silver/gold). Optional: “Create from lead” dropdown to prefill from a selected lead. Call Edge Function with session JWT (same as Add Admin). On success, show “Aspirant created. Share these credentials with the user.” |
| 2.4 | Where to put the button | Either: (A) **Admin → Users** (or “Aspirants”) with a “Create Aspirant” button, or (B) **Admin → Leads** with “Create aspirant” per lead (prefills from that lead). Both can coexist. |

**Outcome:** Admin can create an aspirant and set plan/track without touching SQL or scripts. Aspirant can log in and use the app with that plan.

---

### Phase 3: Admin sets/updates plan for existing aspirant

**Goal:** Change plan or plan start date for an aspirant already in the system (e.g. after a later payment or upgrade).

| Step | What | How |
|------|------|-----|
| 3.1 | RPC or RLS for admin update | Option A: RPC `admin_set_aspirant_plan(aspirant_id, plan, plan_started_at)` with `security definer` and `is_admin()` check. Option B: RLS policy “admins can update aspirants” (then any admin can update any aspirant column; use only if you want that). |
| 3.2 | UI | On **Admin → Users** (aspirant list): per row, “Edit plan” or inline fields for plan and plan start date; save calls the RPC or `supabase.from('aspirants').update(...)`. |

**Outcome:** Plan and plan validity are fully managed from the admin side.

---

### Phase 4: Optional improvements

| Step | What | How |
|------|------|-----|
| 4.1 | Link lead to aspirant | When admin “converts” a lead, set `converted_aspirant_id` on the lead (and mark status = converted). Helps reporting and “which lead became this user”. |
| 4.2 | Email to new aspirant | After creating aspirant, optionally trigger “Set password” or “Welcome” email (Supabase Auth templates or your own). Or keep it manual: admin shares password out of band. |
| 4.3 | Temporary password | Admin sets a one-time password; show “Ask user to change password on first login” (or implement force-change later). |

---

## Summary table

| Phase | Deliverable | Depends on |
|-------|-------------|------------|
| 1 (optional) | Lead status + notes in DB and UI | Migration, small RPC/RLS, Admin Leads UI |
| 2 (core) | Edge Function `create-aspirant` + “Create Aspirant” form in admin | Function + deploy + frontend form |
| 3 | Admin can set/update aspirant plan and plan_started_at | RPC or RLS + Admin Users/Aspirants UI |
| 4 | Optional: link lead→aspirant, email, temp password UX | After 2 & 3 |

---

## Suggested order of implementation

1. **Phase 2** first: create aspirant from admin (Edge Function + “Create Aspirant” form). That gives you the full no-payment flow: lead → contact → offline payment → admin creates aspirant with plan → user logs in.
2. **Phase 3** next: admin can change plan / plan start for existing aspirants.
3. **Phase 1** when you want better lead tracking (status + notes).
4. **Phase 4** as needed (link lead to aspirant, emails, etc.).

This keeps everything without Azure Pay or any payment gateway: all payment and user creation is manual/admin-driven, with plan and validity fully controlled from the admin dashboard.
