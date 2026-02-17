# Supabase setup

## Env variables (app)

In your project root create a **`.env`** file (and add the same in Vercel → Project → Settings → Environment Variables for production):

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- Get both from [Supabase Dashboard](https://app.supabase.com) → your project → **Project Settings** → **API**: use **Project URL** and **anon public** key.
- The `VITE_` prefix is required so Vite exposes them to the browser. Do not put the **service_role** key in the app; use it only in Edge Functions or backend.

---

1. In [Supabase Dashboard](https://app.supabase.com) → your project → **SQL Editor**.
2. Run the contents of `migrations/001_profiles.sql` to create the **aspirants** table and RLS policies.
3. Run the contents of `migrations/003_aspirants_insert_trigger.sql` so aspirant inserts pass RLS (sets `id = auth.uid()`).
4. Run the contents of `migrations/004_admins.sql` to create the **admins** table (name, role, type, email, contact, created_by). Used when a user has no aspirant row (admin login).
5. The user must be **logged in** when submitting the onboarding form (JWT is sent so `auth.uid()` matches the row). Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set (e.g. `.env` and Vercel env vars).

---

## First admin (do this once)

You need **at least one admin** before anyone can use the admin panel. Add the first one from Supabase Dashboard (no login to your app).

### Step 1: Create the auth user

1. Open [Supabase Dashboard](https://app.supabase.com) → your project.
2. Go to **Authentication** → **Users**.
3. Click **Add user** → **Create new user**.
4. Enter **Email** and **Password** for your first admin. Click **Create user**.
5. In the users list, click that user and **copy their UUID** (the `id` field).

### Step 2: Add the admin row

1. Go to **Table Editor** → open the **admins** table.
2. Click **Insert row**.
3. Set **id** = the UUID from Step 1, **name**, **email** (same as Step 1), **role** (e.g. `admin`). Leave **type**, **contact**, **created_by** empty if you like.
4. Save.

That user can **log in to your app** with that email and password and will see the admin panel.

---

## Add more admins later (from the panel)

After the first admin exists, they can log in and use **Admins** → **Add admin** in the app. For that button to work you need the **create-admin** Edge Function deployed and its env set.

### 1. Deploy the Edge Function

From your project root (with [Supabase CLI](https://supabase.com/docs/guides/cli) installed and linked):

```bash
supabase functions deploy create-admin --no-verify-jwt
```

### 2. Env for the Edge Function (admin adding)

The function runs on Supabase and needs:

| Variable | Where to set | Notes |
|----------|----------------|-------|
| **SUPABASE_URL** | Usually **auto-set** when you deploy from the same project. | Your project URL, e.g. `https://xxxx.supabase.co`. |
| **SUPABASE_SERVICE_ROLE_KEY** | Supabase Dashboard → **Project Settings** → **API** → **service_role** (secret). | Set in **Edge Functions** → **create-admin** → **Secrets**: add `SUPABASE_SERVICE_ROLE_KEY` = that key. Or Supabase may inject it when you deploy. |

To add secrets manually: Supabase Dashboard → **Edge Functions** → select **create-admin** → **Secrets** → add `SUPABASE_SERVICE_ROLE_KEY` with the **service_role** key from Project Settings → API. Do **not** put the service_role key in your app `.env`; only in the function.

Once deployed and the key is set, **Add admin** in the app will create the auth user and the `admins` row.
