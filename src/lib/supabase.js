import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client (browser-only).
 * Values are injected at build time by Vite from VITE_* env vars.
 * On Cloudflare Pages, set these as Environment Variables (not Secrets) and redeploy.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail fast instead of silently pointing at the wrong project.
  throw new Error(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Define them in .env (local) or in Cloudflare Pages → Settings → Environment Variables, then rebuild.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'nth-auth-token',
  },
});
