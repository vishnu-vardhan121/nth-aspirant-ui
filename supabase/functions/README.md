# Supabase Edge Functions

## What are these?

Edge Functions run **on Supabase’s servers**, not in the browser. The **Add Admin** form in your dashboard calls the `create-admin` function so that new admins can be created securely (using the service role only on the server).

**If you get an error when clicking “Add Admin”** (e.g. function not found or 404), the function is not deployed yet. Deploy it once per Supabase project.

---

## Deploy `create-admin` (required for “Add Admin” in dashboard)

**Do not** use `npm install -g supabase` — the global npm package is not supported. Use either:

### Option A – From this repo (recommended)

The Supabase CLI is a dev dependency. After `npm install`:

1. **Log in** (one-time per machine):
   ```bash
   npx supabase login
   ```

2. **Link the project** (one-time per machine; project ref from Dashboard → Project Settings → General):
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

3. **Deploy the function**:
   ```bash
   npm run deploy:create-admin
   ```
   or: `npx supabase functions deploy create-admin`

## Deploy `create-aspirant` (required for "Create Aspirant" in dashboard)

Same one-time login/link as above, then:

```bash
npm run deploy:create-aspirant
```

or: `npx supabase functions deploy create-aspirant`

### Option B – Homebrew (macOS)

```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy create-admin
```

**No extra secrets needed.** Supabase injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for deployed functions.
