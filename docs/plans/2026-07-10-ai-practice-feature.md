# AI Practice Feature — Implementation Plan

> **For agentic workers:** Implement phase-by-phase. Each phase should be deployable and testable on its own before moving to the next.

**Goal:** Add paid-only, role/track-based AI voice practice to NTH with 3 difficulty levels, time-bounded sessions, post-session rubric scoring (≥70% to unlock next level), and admin-managed Gemini API key pool.

**Architecture:** React frontend + Supabase Postgres (progress, sessions, API keys) + two Edge Functions (`ai-practice-start`, `ai-practice-evaluate`). Voice engine ported from HirecruitAI (`GeminiLiveStage` logic only — no avatars). Evaluation runs server-side after session using transcript + rubric.

**Tech Stack:** React 19, Vite, Supabase (RLS, RPC, Edge Functions/Deno), Google Gemini Live API + Gemini text API for evaluation.

**Decisions locked:**
- Tracks: technical + non-technical + communication (config-driven)
- Levels: Basic (1) → Medium (2) → Hard (3), sequential unlock
- Session: time-bounded (not fixed question count)
- Pass: ≥70% on topic rubric after session
- Retries: unlimited
- Access: active NTH subscription only
- API keys: N keys in DB, admin-managed, round-robin in edge function

---

## Session timing (constants)

| Level | Name   | Min (end disabled) | Target | Max (auto-wrap) |
|-------|--------|--------------------|--------|-----------------|
| 1     | Basic  | 8 min              | 12 min | 15 min          |
| 2     | Medium | 10 min             | 15 min | 20 min          |
| 3     | Hard   | 12 min             | 18 min | 25 min          |

---

## File map (new files)

```
src/lib/aiPractice/
  tracks.js              # track definitions + categories
  sessionTiming.js       # min/max ms per level
  rubrics.js             # topic areas per track+level (used in prompts + eval)
  api.js                 # invoke edge functions

src/components/ai-practice/
  GeminiLiveSession.jsx  # voice engine (ported, no avatars)
  audio-utils.js
  mic-processor.worklet.js
  SessionTimer.jsx
  TrackCard.jsx
  LevelProgress.jsx
  PracticeResult.jsx

src/pages/dashboard/ai-practice/
  AiPracticeHubPage.jsx
  AiPracticeTrackPage.jsx
  AiPracticeSessionPage.jsx

src/pages/admin/
  AdminAiPracticeKeysPage.jsx

supabase/migrations/
  118_ai_practice_schema.sql
  119_ai_practice_rpcs.sql

supabase/functions/
  ai-practice-start/index.ts
  ai-practice-evaluate/index.ts
  _shared/gemini.ts
  _shared/apiKeyPool.ts
  _shared/prompts.ts
```

---

## Phase 1 — Database schema

**Migration:** `supabase/migrations/118_ai_practice_schema.sql`

### Task 1.1: `ai_gemini_api_keys` table

```sql
create table public.ai_gemini_api_keys (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  api_key text not null,
  is_active boolean not null default true,
  priority int not null default 0,
  usage_count bigint not null default 0,
  error_count int not null default 0,
  last_used_at timestamptz,
  last_error_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

- RLS: admins full access via `is_admin()`
- No SELECT policy for aspirants
- Edge functions use service role

### Task 1.2: `ai_practice_sessions` table

```sql
create table public.ai_practice_sessions (
  id uuid primary key default gen_random_uuid(),
  aspirant_id uuid not null references public.aspirants(id) on delete cascade,
  track text not null,
  level smallint not null check (level between 1 and 3),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'evaluating', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds int,
  transcript text,
  api_key_id uuid references public.ai_gemini_api_keys(id),
  overall_percent numeric(5,2),
  passed boolean,
  area_scores jsonb,
  created_at timestamptz not null default now()
);
```

- Index: `(aspirant_id, track, level, created_at desc)`
- RLS: aspirant reads own rows only

### Task 1.3: `ai_practice_progress` table

```sql
create table public.ai_practice_progress (
  aspirant_id uuid not null references public.aspirants(id) on delete cascade,
  track text not null,
  level smallint not null check (level between 1 and 3),
  status text not null default 'locked'
    check (status in ('locked', 'available', 'passed')),
  best_percent numeric(5,2),
  passed_at timestamptz,
  attempts int not null default 0,
  primary key (aspirant_id, track, level)
);
```

- Level 1 for any track: `available` on first visit (via RPC)
- Level 2/3: `locked` until previous level `passed`

### Task 1.4: RLS policies

- `ai_gemini_api_keys`: admin only
- `ai_practice_sessions`: aspirant SELECT/INSERT own; UPDATE only via RPC
- `ai_practice_progress`: aspirant SELECT own; writes via SECURITY DEFINER RPCs

**Verify:** Run migration locally; confirm tables exist.

---

## Phase 2 — Database RPCs

**Migration:** `supabase/migrations/119_ai_practice_rpcs.sql`

### Task 2.1: `get_ai_practice_progress(p_track text default null)`

Returns all tracks or one track with levels 1–3, status, best_percent, attempts.

### Task 2.2: `start_ai_practice_session(p_track text, p_level smallint)`

1. Verify caller is aspirant with `is_subscription_active(plan, plan_started_at)`
2. Verify level is `available` (level 1 always init as available; level N requires level N-1 passed)
3. Insert `ai_practice_sessions` row `in_progress`
4. Return `{ ok: true, session_id }`

### Task 2.3: `complete_ai_practice_session(p_session_id uuid, p_transcript text, p_duration_seconds int)`

1. Verify session belongs to caller, status `in_progress`
2. Set status `evaluating`, save transcript + ended_at
3. Return `{ ok: true }` — frontend then calls evaluate edge function

### Task 2.4: `save_ai_practice_evaluation(p_session_id uuid, p_overall_percent numeric, p_passed boolean, p_area_scores jsonb)`

Called by evaluate edge function (service role) OR security definer with session token:

1. Update session: `completed`, scores
2. Increment `ai_practice_progress.attempts`
3. If `p_passed` and level status not yet `passed`:
   - Set level `passed`, `best_percent`, `passed_at`
   - Unlock next level (`available`) if level < 3
4. Return `{ ok: true, passed, overall_percent, unlocked_level }`

### Task 2.5: Admin RPCs for API keys

- `admin_list_ai_gemini_keys()` — masked keys (`AIza...last4`)
- `admin_add_ai_gemini_key(p_label, p_api_key)`
- `admin_set_ai_gemini_key_active(p_id, p_is_active)`
- `admin_delete_ai_gemini_key(p_id)`

**Verify:** SQL tests via Supabase SQL editor for subscription gate + unlock chain.

---

## Phase 3 — Track config & rubrics (frontend + shared)

### Task 3.1: `src/lib/aiPractice/tracks.js`

Categories and tracks:

```js
export const AI_PRACTICE_CATEGORIES = [
  { id: 'technical', label: 'Technical' },
  { id: 'non_technical', label: 'Non-Technical' },
  { id: 'communication', label: 'Communication' },
];

export const AI_PRACTICE_TRACKS = [
  { id: 'frontend', label: 'Frontend', category: 'technical' },
  { id: 'backend', label: 'Backend', category: 'technical' },
  { id: 'fullstack', label: 'Full Stack', category: 'technical' },
  { id: 'devops', label: 'DevOps', category: 'technical' },
  { id: 'qa', label: 'QA / Testing', category: 'technical' },
  { id: 'data', label: 'Data / Analytics', category: 'technical' },
  { id: 'mobile', label: 'Mobile', category: 'technical' },
  { id: 'software', label: 'Software / SDE', category: 'technical' },
  { id: 'hr', label: 'HR', category: 'non_technical' },
  { id: 'marketing', label: 'Marketing', category: 'non_technical' },
  { id: 'sales', label: 'Sales', category: 'non_technical' },
  { id: 'operations', label: 'Operations', category: 'non_technical' },
  { id: 'communication', label: 'Interview Communication', category: 'communication' },
];
```

### Task 3.2: `src/lib/aiPractice/sessionTiming.js`

Export `getSessionTiming(level)` → `{ minMs, maxMs, label }`.

### Task 3.3: `src/lib/aiPractice/rubrics.js`

Per `track` + `level`, export array of topic areas:

```js
// Example: frontend level 1
export const RUBRICS = {
  frontend: {
    1: ['HTML fundamentals', 'CSS basics', 'JavaScript basics', 'DOM', 'Debugging', 'Web tools', 'Problem solving', 'Communication'],
    2: [...],
    3: [...],
  },
  communication: { 1: [...], 2: [...], 3: [...] },
  // ... other tracks (MVP: full rubrics for frontend + communication; stubs for rest)
};
```

MVP: complete rubrics for **frontend** + **communication**; other tracks can share generic rubrics initially.

### Task 3.4: `supabase/functions/_shared/prompts.ts`

`buildLivePrompt(track, level, rubricAreas)` — interviewer prompt:
- Difficulty by level (basic / medium / hard questions)
- Cover rubric areas naturally over session
- One question at a time, wait for answer
- Do NOT score during session; at end give brief verbal wrap-up only
- Min session length guidance in prompt

`buildEvaluationPrompt(track, level, rubricAreas, transcript)` — text API prompt:
- Score each area 0–2
- Return strict JSON: `{ overall_percent, passed, areas: [{ name, score, note }] }`
- `passed = overall_percent >= 70`

---

## Phase 4 — Edge function: `ai-practice-start`

**File:** `supabase/functions/ai-practice-start/index.ts`

### Flow

1. CORS + JWT verify aspirant
2. Body: `{ session_id, track, level }`
3. Verify session exists, belongs to user, `in_progress`
4. `pickApiKey()` from `_shared/apiKeyPool.ts`:
   - Select active key order by `priority desc, last_used_at asc nulls first`
   - On failure increment `error_count`, try next
5. Create Gemini constrained token with `buildLivePrompt(track, level)`
6. Update session `api_key_id`, increment key `usage_count`
7. Return `{ token, model, wsConfig, session_id }`

### Shared: `_shared/gemini.ts`

Port token creation from HirecruitAI `gemini.service.js` (Deno + fetch or `@google/genai` via esm.sh).

### Deploy

```bash
supabase secrets set GEMINI_MODEL_ID=gemini-2.5-flash-native-audio-preview-12-2025
supabase functions deploy ai-practice-start
```

**Verify:** Paid aspirant can get token; unpaid gets 403; no keys returns 503.

---

## Phase 5 — Edge function: `ai-practice-evaluate`

**File:** `supabase/functions/ai-practice-evaluate/index.ts`

### Flow

1. JWT verify aspirant
2. Body: `{ session_id }`
3. Load session transcript (must be `evaluating`)
4. Pick API key (same pool)
5. Call Gemini **text** API with `buildEvaluationPrompt(...)`
6. Parse JSON; validate `overall_percent`, `areas`
7. Call `save_ai_practice_evaluation` RPC
8. Return `{ passed, overall_percent, areas, unlocked_level }`

**Verify:** Mock transcript returns consistent JSON; 70% threshold unlocks next level.

---

## Phase 6 — Voice component (HirecruitAI core only)

### Task 6.1: Copy & adapt audio files

From HirecruitAI:
- `audio-utils.js` → `src/components/ai-practice/audio-utils.js`
- `mic-processor.worklet.js` → `src/components/ai-practice/mic-processor.worklet.js`

### Task 6.2: `GeminiLiveSession.jsx`

Port from `GeminiLiveStage.tsx`, **remove**:
- Avatars, camera, resume PDF parsing, Hirecruit branding, navigate to feedback

**Keep**:
- WebSocket connect with constrained token
- Mic worklet, PCM playback, silence `audioStreamEnd`
- Connection status, timer display
- Transcript accumulation: collect `serverContent` text parts + optional client-side speech notes

**Props:**

```jsx
<GeminiLiveSession
  sessionId={sessionId}
  track={track}
  level={level}
  minMs={minMs}
  maxMs={maxMs}
  onSessionEnd={({ transcript, durationSeconds }) => ...}
  onError={...}
/>
```

### Task 6.3: `SessionTimer.jsx`

- Show elapsed / max
- Disable "End interview" until `minMs`
- Auto-trigger end at `maxMs`

### Task 6.4: `src/lib/aiPractice/api.js`

```js
export async function fetchPracticeToken(sessionId, track, level) { ... }
export async function evaluatePracticeSession(sessionId) { ... }
```

Uses `supabase.functions.invoke('ai-practice-start', ...)` pattern.

**Verify:** Local dev with one test API key; voice session connects and ends.

---

## Phase 7 — Admin: API key management

### Task 7.1: `AdminAiPracticeKeysPage.jsx`

- List keys (masked), usage_count, last_used_at, is_active
- Add key form (label + api_key)
- Toggle active, delete with confirm
- Empty state: "Add at least one Gemini API key to enable AI Practice"

### Task 7.2: Wire routes

- `src/App.jsx`: `<Route path="ai-practice-keys" element={<AdminAiPracticeKeysPage />} />`
- `src/layouts/AdminLayout.jsx`: nav link under Settings area

**Verify:** Admin can add key; aspirant session uses it (usage_count increments).

---

## Phase 8 — Aspirant UI

### Task 8.1: `AiPracticeHubPage.jsx` (`/dashboard/ai-practice`)

- Paywall if `!isSubscriptionActive(...)` → link to payments/plan modal
- Category tabs: Technical | Non-Technical | Communication
- Grid of `TrackCard`: track name, progress 0/3 … 3/3 Completed
- Link to track detail

### Task 8.2: `AiPracticeTrackPage.jsx` (`/dashboard/ai-practice/:trackId`)

- Three `LevelProgress` rows: Basic / Medium / Hard
- Status: Locked | Start | Passed (best %)
- "Practice again" always available on unlocked levels
- Start → creates session via RPC → navigate to session page

### Task 8.3: `AiPracticeSessionPage.jsx`

- Load session, call `ai-practice-start`, render `GeminiLiveSession`
- On end: save transcript via `complete_ai_practice_session`
- Call `ai-practice-evaluate`, show loading "Evaluating…"
- Render `PracticeResult` with area breakdown

### Task 8.4: `PracticeResult.jsx`

- Score %, pass/fail badge
- Per-area bars
- If passed + unlocked: "Level 2 unlocked"
- If track complete (3/3): celebration badge
- Buttons: Retry | Back to track | Next level

### Task 8.5: Navigation

- `DashboardLayout.jsx`: add sidebar link "AI Practice" (e.g. `HiCpuChip` icon)
- `App.jsx`: routes under `/dashboard`

**Verify:** Full flow: hub → track → session → result → unlock.

---

## Phase 9 — MVP prompts & rubrics content

### Task 9.1: Frontend track (all 3 levels)

Write full rubrics + live prompts + eval prompts in `_shared/prompts.ts` / `rubrics.js`.

### Task 9.2: Communication track (all 3 levels)

Same structure.

### Task 9.3: Other tracks

Use level-appropriate generic rubrics per category until refined:
- `technical_generic`
- `non_technical_generic`

Map track id → generic rubric if no specific rubric defined.

**Verify:** Manual test sessions at each level feel appropriately easy/medium/hard.

---

## Phase 10 — Polish & production

### Task 10.1: Error handling

- No API keys → admin message + aspirant friendly error
- Gemini quota exceeded → try next key, then error
- Evaluation parse failure → retry once, then "Could not evaluate, try again"

### Task 10.2: Session abandon cleanup

- If user closes tab mid-session, mark `abandoned` after timeout (optional cron or on next start)

### Task 10.3: Docs

- `docs/AI_PRACTICE.md` — aspirant + admin guide

### Task 10.4: Deploy checklist

1. Run migrations 118, 119 on production Supabase
2. Deploy both edge functions
3. Admin adds production API keys
4. Smoke test with paid test aspirant

---

## Implementation order (summary)

| Step | Phase | Deliverable | Can test |
|------|-------|-------------|----------|
| 1 | Phase 1 | DB tables | Migration runs |
| 2 | Phase 2 | RPCs | SQL + subscription gate |
| 3 | Phase 3 | Track/rubric config | Unit sanity |
| 4 | Phase 4 | `ai-practice-start` | Token returned |
| 5 | Phase 7 | Admin keys UI | Keys in DB |
| 6 | Phase 5 | `ai-practice-evaluate` | Mock eval works |
| 7 | Phase 6 | Voice component | Audio session |
| 8 | Phase 8 | Aspirant UI | End-to-end |
| 9 | Phase 9 | Prompts content | Quality check |
| 10 | Phase 10 | Polish + deploy | Production |

**Note:** Phase 7 (admin keys) before Phase 6 testing — need keys in DB to test voice.

---

## Out of scope (v1)

- Avatars / video UI
- Session recordings storage
- Placement pipeline integration
- Per-plan AI practice limits (all paid = unlimited)
- Pricing page marketing copy update (can add later)

---

## Dependencies to add

Edge function (via esm.sh or deno import):
- `@google/genai` (same as HirecruitAI)

Frontend: no new npm packages required if using existing patterns.

---

## Risk mitigations

| Risk | Mitigation |
|------|------------|
| Live API no text transcript | Prompt model to include text in responses; accumulate turn text from WS messages |
| Eval JSON malformed | Strict schema prompt + zod parse + retry |
| Key exhaustion | Admin dashboard shows error_count; auto-skip bad keys |
| Long sessions cost | Hard max time auto-end |
