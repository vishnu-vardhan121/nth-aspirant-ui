# Plan: Password reset (Supabase Auth + email verification)

Users can reset their password via email: request reset → receive link → set new password. Supabase Auth handles sending the email and validating the token.

---

## How Supabase password reset works

1. **Request reset** – App calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://yoursite.com/reset-password' })`. Supabase sends an email with a magic link.
2. **User clicks link** – Link goes to your `redirectTo` URL with hash fragment `#access_token=...&type=recovery`. Supabase Auth can recover the session from this.
3. **Set new password** – App calls `supabase.auth.updateUser({ password: newPassword })` while the recovery session is active. After that, the user can sign in with the new password.

No custom backend needed; Supabase sends the email and issues the recovery token.

---

## What to implement

### 1. Forgot password entry (request reset)

- **Where:** Login page: add a “Forgot password?” link that goes to `/forgot-password`.
- **Page `/forgot-password`:**
  - Single field: email.
  - Submit → `supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })`.
  - Show message: “If an account exists for this email, you’ll receive a link to reset your password.” (Don’t reveal whether the email exists.)

### 2. Reset password page (set new password after clicking email link)

- **Route:** `/reset-password`.
- **Behaviour:**
  - User lands here from the email link (Supabase redirects with `#access_token=...&type=recovery`). Supabase client will pick this up from the URL and establish a recovery session.
  - Page shows a form: “New password” + “Confirm password”.
  - Submit → `supabase.auth.updateUser({ password: newPassword })`.
  - On success: optional redirect to `/login` with a “Password updated. Sign in with your new password.” message (e.g. via search param `?reset=1`), and clear the URL hash if needed.

### 3. Supabase Dashboard config

- **Authentication → URL configuration:**
  - Add **Redirect URL**: `https://your-domain.com/reset-password` (and `http://localhost:5173/reset-password` for dev).
- **Authentication → Email templates:**
  - Customize “Reset password” email if you want (subject, body). Default works; ensure the link uses your app’s redirect URL.

### 4. Optional: detect recovery on load

- On `/reset-password`, wait for the client to process the hash (e.g. `getSession()` or `onAuthStateChange`). If there’s a session with `event === 'PASSWORD_RECOVERY'` or the URL has `type=recovery`, show the “Set new password” form; otherwise show “Invalid or expired link” and a link back to `/forgot-password`.

Supabase fires `onAuthStateChange` with `event: 'PASSWORD_RECOVERY'` when the user lands with a recovery link; you can use that to show the form only when the recovery session is active.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Add “Forgot password?” on Login → `/forgot-password`. |
| 2 | **ForgotPasswordPage**: email input → `resetPasswordForEmail(email, { redirectTo })` → success message. |
| 3 | Add route `/reset-password`. |
| 4 | **ResetPasswordPage**: on load, let Supabase consume hash; show “New password” + “Confirm”; `updateUser({ password })` → redirect to login. |
| 5 | In Supabase Dashboard, add redirect URL for `/reset-password` (prod + dev). |

No backend or “Zepp”-specific code; this is standard Supabase Auth with email verification via the reset link.

---

## Implemented in this repo

- **Login page:** “Forgot password?” link → `/forgot-password`.
- **ForgotPasswordPage** (`/forgot-password`): email field → `resetPasswordForEmail` → success message.
- **ResetPasswordPage** (`/reset-password`): waits for recovery session (hash `type=recovery`), then form for new password + confirm → `updateUser({ password })` → redirect to `/login?reset=1`.
- **Login** with `?reset=1`: shows “Password updated. Sign in with your new password.”

**You must:** In Supabase Dashboard → **Authentication** → **URL Configuration**, add **Redirect URL**:  
`https://your-production-domain.com/reset-password` and `http://localhost:5173/reset-password` for local dev.
