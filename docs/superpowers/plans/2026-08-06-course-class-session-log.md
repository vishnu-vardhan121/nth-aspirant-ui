# Course Class Session Log — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff can attach a recording URL, ≥3 covered topics, and a Zoom participants CSV (email + Total Duration minutes) to a live class, with an uploader-chosen min-duration rule driving attended vs too-short.

**Architecture:** Extend `course_classes` for session metadata; new `course_class_attendance` table; one SECURITY DEFINER RPC to save session + replace attendance rows from a JSON payload. Client parses Zoom CSV (papaparse or small custom parser), builds rows, posts via `src/lib/courses.js`. Staff UI modal from `CourseClassesManager`. Aspirants never read these fields in v1 (RLS staff-only for attendance; recording/topics columns exist but aspirant list RPC stays unchanged so UI cannot show them).

**Tech Stack:** React/Vite, Supabase SQL migrations/RPCs/RLS, existing `is_course_staff()`, `CourseClassesManager`, `src/lib/courses.js`.

**Spec:** `docs/superpowers/specs/2026-08-06-course-class-session-log-design.md`

## Global Constraints

- Match attendance by **email only** (lower(trim)); skip empty emails
- Duration from Zoom column **Total Duration (Minutes)** (flexible header match)
- Min duration set by **uploader** each save (integer ≥ 1); not a global constant
- Covered topics: **≥ 3** non-empty trimmed strings
- Recording URL required when saving session (trim length ≥ 8)
- Re-upload **deletes** prior `course_class_attendance` for that class, then inserts anew
- Staff only: `is_course_staff()`; no aspirant UI for recording/topics/attendance in this plan
- Never expose raw technical errors to aspirants (staff UI may show RPC `error` strings)
- Migration number: **128** (after `127_course_live_classes.sql`)

---

## File map

| Area | Path | Responsibility |
|------|------|----------------|
| Spec | `docs/superpowers/specs/2026-08-06-course-class-session-log-design.md` | Locked product decisions |
| Migration | `supabase/migrations/128_course_class_session_log.sql` | Columns, table, RLS, RPCs |
| CSV parse | `src/lib/zoomParticipantsCsv.js` | Parse file → `{ email, durationMinutes }[]` + skip blanks |
| Match helper (pure) | `src/lib/courseClassAttendance.js` | Apply min duration + member map → status rows (unit-testable) |
| API | `src/lib/courses.js` | `staffGetCourseClassSession`, `staffSaveCourseClassSession` |
| UI modal | `src/components/courses/CourseClassSessionModal.jsx` | Form: recording, topics, min mins, CSV, preview, save |
| Wire-up | `src/components/courses/CourseClassesManager.jsx` | “Manage session” button per class |
| Tests | `src/lib/zoomParticipantsCsv.test.js`, `src/lib/courseClassAttendance.test.js` | Repo has no test runner today — add `vitest` + `"test": "vitest run"` in Task 1 (preferred) |

---

### Task 1: Pure CSV + match helpers (TDD)

**Files:**
- Create: `src/lib/zoomParticipantsCsv.js`
- Create: `src/lib/courseClassAttendance.js`
- Create: `src/lib/zoomParticipantsCsv.test.js`
- Create: `src/lib/courseClassAttendance.test.js`

**Interfaces:**
- Produces:
  - `parseZoomParticipantsCsv(text: string): { ok: true, rows: { email: string, durationMinutes: number, name: string | null }[] } | { ok: false, error: string }`
  - `buildAttendancePayload({ csvRows, freeMembers, minDurationMinutes }): { rows: AttendanceRowInput[], summary: { attended, too_short, not_in_batch, absent } }`
  - Types: `AttendanceRowInput = { email: string, aspirant_id: string | null, duration_minutes: number | null, status: 'attended' | 'too_short' | 'not_in_batch' | 'absent' }`
  - `freeMembers`: `{ aspirant_id: string, email: string }[]`

- [ ] **Step 1: Write failing tests for CSV parse**

```js
// src/lib/zoomParticipantsCsv.test.js
import { describe, it, expect } from 'vitest';
import { parseZoomParticipantsCsv } from './zoomParticipantsCsv';

describe('parseZoomParticipantsCsv', () => {
  it('reads User Email + Total Duration (Minutes); skips empty email', () => {
    const text = [
      'Name (Original Name),User Email,Total Duration (Minutes)',
      'Alice,alice@nth.edu,65',
      'Guest,,12',
      'Bob,bob@Example.com,5',
    ].join('\n');
    const res = parseZoomParticipantsCsv(text);
    expect(res.ok).toBe(true);
    expect(res.rows).toEqual([
      { email: 'alice@nth.edu', durationMinutes: 65, name: 'Alice' },
      { email: 'bob@example.com', durationMinutes: 5, name: 'Bob' },
    ]);
  });

  it('errors when required columns missing', () => {
    const res = parseZoomParticipantsCsv('Name,Email\nA,a@b.com\n');
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/duration|email/i);
  });
});
```

- [ ] **Step 2: Write failing tests for attendance builder**

```js
// src/lib/courseClassAttendance.test.js
import { describe, it, expect } from 'vitest';
import { buildAttendancePayload } from './courseClassAttendance';

const members = [
  { aspirant_id: 'a1', email: 'alice@nth.edu' },
  { aspirant_id: 'a2', email: 'carol@nth.edu' },
];

describe('buildAttendancePayload', () => {
  it('classifies attended, too_short, not_in_batch, absent', () => {
    const { rows, summary } = buildAttendancePayload({
      csvRows: [
        { email: 'alice@nth.edu', durationMinutes: 40 },
        { email: 'bob@outside.com', durationMinutes: 90 },
        { email: 'alice@nth.edu', durationMinutes: 10 }, // same email: sum durations
      ],
      freeMembers: members,
      minDurationMinutes: 30,
    });
    expect(summary).toEqual({ attended: 1, too_short: 0, not_in_batch: 1, absent: 1 });
    const byEmail = Object.fromEntries(rows.map((r) => [r.email, r]));
    expect(byEmail['alice@nth.edu']).toMatchObject({
      status: 'attended',
      aspirant_id: 'a1',
      duration_minutes: 50,
    });
    expect(byEmail['bob@outside.com'].status).toBe('not_in_batch');
    expect(byEmail['carol@nth.edu']).toMatchObject({ status: 'absent', aspirant_id: 'a2', duration_minutes: null });
  });
});
```

- [ ] **Step 3: Add vitest (repo has none today)**

```bash
npm install -D vitest
```

Add to `package.json` scripts: `"test": "vitest run"`. If preferred not to add a runner, skip test files and manually exercise helpers in the modal preview instead — but keep the test files if vitest is added.

- [ ] **Step 4: Implement `parseZoomParticipantsCsv`**

```js
// src/lib/zoomParticipantsCsv.js
function normHeader(h) {
  return String(h || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase();
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (c === ',' && !q) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function pickEmailIdx(headers) {
  const prefs = ['user email', 'email', 'user email address'];
  for (const p of prefs) {
    const i = headers.findIndex((h) => h === p);
    if (i >= 0) return i;
  }
  return headers.findIndex((h) => h.includes('email'));
}

function pickDurationIdx(headers) {
  const i = headers.findIndex(
    (h) => h.includes('total duration') && (h.includes('minute') || h.includes('(minutes)'))
  );
  if (i >= 0) return i;
  return headers.findIndex((h) => h === 'total duration (minutes)');
}

function pickNameIdx(headers) {
  const i = headers.findIndex((h) => h.includes('name (original name)') || h === 'name');
  return i;
}

/** @param {string} text */
export function parseZoomParticipantsCsv(text) {
  const raw = String(text || '').replace(/^\uFEFF/, '').trim();
  if (!raw) return { ok: false, error: 'CSV is empty.' };
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length < 2) return { ok: false, error: 'CSV needs a header and at least one row.' };
  const headers = splitCsvLine(lines[0]).map(normHeader);
  const emailIdx = pickEmailIdx(headers);
  const durIdx = pickDurationIdx(headers);
  if (emailIdx < 0) return { ok: false, error: 'Could not find an email column (expected “User Email”).' };
  if (durIdx < 0) {
    return {
      ok: false,
      error: 'Could not find “Total Duration (Minutes)” column.',
    };
  }
  const nameIdx = pickNameIdx(headers);
  const rows = [];
  for (let li = 1; li < lines.length; li++) {
    const cols = splitCsvLine(lines[li]);
    const email = String(cols[emailIdx] || '').trim().toLowerCase();
    if (!email || !email.includes('@')) continue;
    const durationMinutes = Number.parseInt(String(cols[durIdx] || '').trim(), 10);
    if (!Number.isFinite(durationMinutes) || durationMinutes < 0) continue;
    const name = nameIdx >= 0 ? String(cols[nameIdx] || '').trim() || null : null;
    rows.push({ email, durationMinutes, name });
  }
  if (!rows.length) return { ok: false, error: 'No rows with email and duration found.' };
  return { ok: true, rows };
}
```

- [ ] **Step 5: Implement `buildAttendancePayload`**

```js
// src/lib/courseClassAttendance.js
/**
 * Sum CSV duration by email, classify vs free members and min duration.
 * @param {{ csvRows: {email:string,durationMinutes:number}[], freeMembers:{aspirant_id:string,email:string}[], minDurationMinutes:number }} args
 */
export function buildAttendancePayload({ csvRows, freeMembers, minDurationMinutes }) {
  const min = Math.max(1, Math.floor(Number(minDurationMinutes) || 0));
  const byEmail = new Map();
  for (const r of csvRows || []) {
    const email = String(r.email || '').trim().toLowerCase();
    if (!email) continue;
    const prev = byEmail.get(email) || 0;
    byEmail.set(email, prev + (Number(r.durationMinutes) || 0));
  }

  const memberByEmail = new Map();
  for (const m of freeMembers || []) {
    const email = String(m.email || '').trim().toLowerCase();
    if (!email) continue;
    memberByEmail.set(email, m.aspirant_id);
  }

  /** @type {import('./courseClassAttendanceTypes').AttendanceRowInput[]} */
  const rows = [];
  const seenMembers = new Set();

  for (const [email, duration] of byEmail) {
    const aspirantId = memberByEmail.get(email) || null;
    if (aspirantId) {
      seenMembers.add(email);
      rows.push({
        email,
        aspirant_id: aspirantId,
        duration_minutes: duration,
        status: duration >= min ? 'attended' : 'too_short',
      });
    } else {
      rows.push({
        email,
        aspirant_id: null,
        duration_minutes: duration,
        status: 'not_in_batch',
      });
    }
  }

  for (const [email, aspirantId] of memberByEmail) {
    if (seenMembers.has(email)) continue;
    rows.push({
      email,
      aspirant_id: aspirantId,
      duration_minutes: null,
      status: 'absent',
    });
  }

  const summary = { attended: 0, too_short: 0, not_in_batch: 0, absent: 0 };
  for (const r of rows) summary[r.status] += 1;
  return { rows, summary };
}
```

(Do not create a separate types file unless useful — JSDoc in the same file is enough.)

- [ ] **Step 6: Run tests**

Run: `npm test -- --run src/lib/zoomParticipantsCsv.test.js src/lib/courseClassAttendance.test.js`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/zoomParticipantsCsv.js src/lib/courseClassAttendance.js src/lib/zoomParticipantsCsv.test.js src/lib/courseClassAttendance.test.js
git commit -m "$(cat <<'EOF'
feat: add Zoom CSV parse and attendance status helpers

EOF
)"
```

---

### Task 2: Migration — schema + RPCs

**Files:**
- Create: `supabase/migrations/128_course_class_session_log.sql`

**Interfaces:**
- Produces RPCs:
  - `staff_get_course_class_session(p_class_id uuid) → jsonb`
  - `staff_save_course_class_session(p_class_id uuid, p_recording_url text, p_covered_topics text[], p_min_duration_minutes int, p_rows jsonb) → jsonb`
  - `staff_list_course_class_free_members(p_course_id uuid) → jsonb` — emails for match (`aspirant_id`, `email`)

- [ ] **Step 1: Write migration SQL**

```sql
-- 128_course_class_session_log.sql
-- Staff session log: recording URL, covered topics (≥3), Zoom attendance by email.

alter table public.course_classes
  add column if not exists recording_url text,
  add column if not exists covered_topics text[] not null default '{}',
  add column if not exists attendance_min_duration_minutes int,
  add column if not exists session_logged_at timestamptz,
  add column if not exists session_logged_by uuid references public.admins(id) on delete set null;

comment on column public.course_classes.recording_url is
  'Post-class recording URL (staff-managed; aspirant UI later).';
comment on column public.course_classes.covered_topics is
  'Bullet topics covered; enforce ≥3 on save RPC.';
comment on column public.course_classes.attendance_min_duration_minutes is
  'Min Total Duration (minutes) from last attendance upload (set by uploader).';

create table if not exists public.course_class_attendance (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.course_classes(id) on delete cascade,
  aspirant_id uuid references public.aspirants(id) on delete set null,
  email text not null,
  duration_minutes int,
  status text not null,
  uploaded_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint course_class_attendance_status_check
    check (status in ('attended', 'too_short', 'not_in_batch', 'absent')),
  constraint course_class_attendance_email_nonempty
    check (char_length(trim(email)) >= 3)
);

create index if not exists course_class_attendance_class_idx
  on public.course_class_attendance (class_id);

create index if not exists course_class_attendance_aspirant_idx
  on public.course_class_attendance (aspirant_id)
  where aspirant_id is not null;

create unique index if not exists course_class_attendance_class_email_uidx
  on public.course_class_attendance (class_id, lower(trim(email)));

alter table public.course_class_attendance enable row level security;

drop policy if exists "course_class_attendance_staff_all" on public.course_class_attendance;
create policy "course_class_attendance_staff_all"
  on public.course_class_attendance for all to authenticated
  using (public.is_course_staff())
  with check (public.is_course_staff());

-- No aspirant select policy in v1 (staff only).

create or replace function public.staff_list_course_class_free_members(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not public.is_course_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed');
  end if;
  if p_course_id is null then
    return jsonb_build_object('ok', false, 'error', 'Course is required');
  end if;

  return jsonb_build_object(
    'ok', true,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'aspirant_id', a.id,
        'email', lower(trim(a.email)),
        'full_name', a.full_name
      ) order by lower(trim(a.email)))
      from public.course_members m
      join public.aspirants a on a.id = m.aspirant_id
      where m.course_id = p_course_id
        and m.status = 'free'
        and coalesce(trim(a.email), '') <> ''
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.staff_get_course_class_session(p_class_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cl public.course_classes%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not public.is_course_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed');
  end if;

  select * into v_cl from public.course_classes where id = p_class_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Class not found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'class', jsonb_build_object(
      'id', v_cl.id,
      'course_id', v_cl.course_id,
      'title', v_cl.title,
      'starts_at', v_cl.starts_at,
      'recording_url', v_cl.recording_url,
      'covered_topics', coalesce(to_jsonb(v_cl.covered_topics), '[]'::jsonb),
      'attendance_min_duration_minutes', v_cl.attendance_min_duration_minutes,
      'session_logged_at', v_cl.session_logged_at
    ),
    'attendance', coalesce((
      select jsonb_agg(to_jsonb(att) order by att.status, att.email)
      from public.course_class_attendance att
      where att.class_id = p_class_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.staff_save_course_class_session(
  p_class_id uuid,
  p_recording_url text,
  p_covered_topics text[],
  p_min_duration_minutes int,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cl public.course_classes%rowtype;
  v_url text := trim(coalesce(p_recording_url, ''));
  v_topics text[];
  v_min int := coalesce(p_min_duration_minutes, 0);
  v_elem jsonb;
  v_email text;
  v_status text;
  v_dur int;
  v_asp uuid;
  v_count int := 0;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if not public.is_course_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not allowed');
  end if;

  select * into v_cl from public.course_classes where id = p_class_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Class not found');
  end if;

  if char_length(v_url) < 8 then
    return jsonb_build_object('ok', false, 'error', 'Recording link is required');
  end if;

  select coalesce(array_agg(trim(t)), '{}')
    into v_topics
  from unnest(coalesce(p_covered_topics, '{}')) as t
  where char_length(trim(t)) >= 1;

  if coalesce(array_length(v_topics, 1), 0) < 3 then
    return jsonb_build_object('ok', false, 'error', 'Add at least 3 covered topics');
  end if;

  if v_min < 1 then
    return jsonb_build_object('ok', false, 'error', 'Min duration must be at least 1 minute');
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) < 1 then
    return jsonb_build_object('ok', false, 'error', 'Attendance rows are required');
  end if;

  update public.course_classes set
    recording_url = v_url,
    covered_topics = v_topics,
    attendance_min_duration_minutes = v_min,
    session_logged_at = now(),
    session_logged_by = auth.uid(),
    updated_by = auth.uid()
  where id = p_class_id;

  delete from public.course_class_attendance where class_id = p_class_id;

  for v_elem in select * from jsonb_array_elements(p_rows)
  loop
    v_email := lower(trim(coalesce(v_elem->>'email', '')));
    v_status := trim(coalesce(v_elem->>'status', ''));
    v_dur := nullif(v_elem->>'duration_minutes', '')::int;
    v_asp := nullif(v_elem->>'aspirant_id', '')::uuid;

    if v_email = '' then
      continue;
    end if;
    if v_status not in ('attended', 'too_short', 'not_in_batch', 'absent') then
      return jsonb_build_object('ok', false, 'error', 'Invalid attendance status');
    end if;

    insert into public.course_class_attendance (
      class_id, aspirant_id, email, duration_minutes, status, uploaded_by
    ) values (
      p_class_id, v_asp, v_email, v_dur, v_status, auth.uid()
    );
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'saved_count', v_count);
end;
$$;

grant execute on function public.staff_list_course_class_free_members(uuid) to authenticated;
grant execute on function public.staff_get_course_class_session(uuid) to authenticated;
grant execute on function public.staff_save_course_class_session(uuid, text, text[], int, jsonb) to authenticated;
```

Verify `aspirants.full_name` exists; if the column is `name` instead, use that in the members RPC only.

- [ ] **Step 2: Confirm aspirant name column**

Run ripgrep for aspirants table columns or read `001_aspirants.sql`. Use existing column name in `staff_list_course_class_free_members`.

- [ ] **Step 3: Push migration to DEV**

```bash
npx supabase db push
```

Expected: migration `128` applied without error. Link CLI to DEV project first if needed (see `.env.development`).

- [ ] **Step 4: Smoke RPC in SQL editor (optional)**

Call `staff_get_course_class_session` as staff with a real class id → `{ ok: true, ... }`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/128_course_class_session_log.sql
git commit -m "$(cat <<'EOF'
feat(db): course class session log and attendance table

EOF
)"
```

---

### Task 3: Lib wrappers in `courses.js`

**Files:**
- Modify: `src/lib/courses.js` (append after staff delete helpers)

**Interfaces:**
- Consumes: RPCs from Task 2
- Produces:
  - `staffListCourseClassFreeMembers(courseId)`
  - `staffGetCourseClassSession(classId)`
  - `staffSaveCourseClassSession({ classId, recordingUrl, coveredTopics, minDurationMinutes, rows })`

- [ ] **Step 1: Add wrappers**

```js
export async function staffListCourseClassFreeMembers(courseId) {
  const { data, error } = await supabase.rpc('staff_list_course_class_free_members', {
    p_course_id: courseId,
  });
  return parseRpc(data, error);
}

export async function staffGetCourseClassSession(classId) {
  const { data, error } = await supabase.rpc('staff_get_course_class_session', {
    p_class_id: classId,
  });
  return parseRpc(data, error);
}

export async function staffSaveCourseClassSession(payload) {
  const { data, error } = await supabase.rpc('staff_save_course_class_session', {
    p_class_id: payload.classId,
    p_recording_url: payload.recordingUrl,
    p_covered_topics: payload.coveredTopics,
    p_min_duration_minutes: payload.minDurationMinutes,
    p_rows: payload.rows,
  });
  return parseRpc(data, error);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/courses.js
git commit -m "$(cat <<'EOF'
feat: add staff session log RPC wrappers

EOF
)"
```

---

### Task 4: `CourseClassSessionModal` UI

**Files:**
- Create: `src/components/courses/CourseClassSessionModal.jsx`

**Interfaces:**
- Consumes: helpers + course RPCs from Tasks 1–3
- Props: `{ open, onClose, courseId, classId, classTitle, onSaved }`

- [ ] **Step 1: Implement modal**

Behavior:

1. On open: `staffGetCourseClassSession` + `staffListCourseClassFreeMembers(courseId)`.
2. Prefill recording URL, topics (pad to 3 empty inputs if none), min duration (default **30** if null).
3. Topics UI: list of text inputs; Add topic / Remove; filter empty on submit; block save if &lt; 3.
4. File input `accept=".csv,text/csv"` → `FileReader.readAsText` → `parseZoomParticipantsCsv` → `buildAttendancePayload` → show summary counts + scrollable preview table (email, minutes, status).
5. Save calls `staffSaveCourseClassSession` with `{ classId, recordingUrl, coveredTopics, minDurationMinutes, rows }` where `rows` match builder output (snake_case keys as in SQL).
6. Match existing modal patterns in the app (`JoinLiveClassModal` fixed overlay, rounded panel, primary button). Keep styles aligned with `CourseClassesManager` (slate borders, rounded-xl on mobile).

Key validation copy:

- “Recording link is required.”
- “Add at least 3 covered topics.”
- “Min duration (minutes) is required.”
- “Upload a Zoom participants CSV first.”

- [ ] **Step 2: Manual UI check**

Open modal from a temporary button if Task 5 not done yet; verify topics count validation without network.

- [ ] **Step 3: Commit**

```bash
git add src/components/courses/CourseClassSessionModal.jsx
git commit -m "$(cat <<'EOF'
feat: add staff class session modal for recording, topics, attendance

EOF
)"
```

---

### Task 5: Wire into `CourseClassesManager`

**Files:**
- Modify: `src/components/courses/CourseClassesManager.jsx`

- [ ] **Step 1: Add state + button**

- State: `sessionClass` (`null | { id, title }`)
- On each class row actions: button **Manage session** → `setSessionClass({ id: row.id, title: row.title })`
- Render:

```jsx
{sessionClass ? (
  <CourseClassSessionModal
    open
    courseId={courseId}
    classId={sessionClass.id}
    classTitle={sessionClass.title}
    onClose={() => setSessionClass(null)}
    onSaved={() => {
      setSessionClass(null);
      load();
    }}
  />
) : null}
```

- Optional list hint: if `staffListCourseClasses` later returns `session_logged_at`, show a small “Session logged” badge — today `to_jsonb(cl)` already returns new columns after migration, so show badge when `row.session_logged_at` is truthy.

- [ ] **Step 2: Browser smoke**

1. Admin or interviewer → course live classes.
2. Manage session → paste a Drive/YouTube recording URL.
3. Enter 3 topics.
4. Set min duration e.g. 30.
5. Upload Zoom CSV with Total Duration (Minutes).
6. Confirm preview counts; Save.
7. Re-open modal → data prefilled; attendance list present.
8. Re-upload different CSV → prior attendance replaced.

- [ ] **Step 3: Commit**

```bash
git add src/components/courses/CourseClassesManager.jsx
git commit -m "$(cat <<'EOF'
feat: wire Manage session into course classes manager

EOF
)"
```

---

### Task 6: Verification checklist

- [ ] Migration 128 on DEV
- [ ] Non-staff RPC → `Not allowed`
- [ ] Save blocked with 2 topics
- [ ] Save blocked without recording URL
- [ ] Empty-email CSV rows ignored
- [ ] Same email multiple CSV lines → durations summed
- [ ] Duration ≥ min → `attended`; &lt; min → `too_short`
- [ ] CSV email not in free members → `not_in_batch`
- [ ] Free member missing from CSV → `absent`
- [ ] Aspirant course upcoming list still does **not** show recording/topics (no frontend change; confirm Join flow unchanged)
- [ ] Duration minutes stored on attended/too_short/not_in_batch for later

---

## Deferred (not in this plan)

- Aspirant-facing recording player / topics on class cards
- Attendance % reports for batch
- Parsing Zoom `Duration (HH:MM:SS)` instead of/in addition to Total Duration
- Soft-require profile email completeness before join (already partially handled by Join modal copy)

---

## Self-review

| Spec item | Task |
|-----------|------|
| Recording URL like 10k Coders | Tasks 2, 4 |
| ≥3 covered topics | Tasks 2, 4 |
| Min duration by uploader | Tasks 2, 4 |
| CSV Total Duration (Minutes) | Task 1 |
| Email-only match; skip blank | Task 1 |
| Staff-only visibility | Task 2 RLS; no aspirant UI |
| Store duration for later | Task 2 columns |
| Wire admin + interviewer UIs | Task 5 (shared manager) |
