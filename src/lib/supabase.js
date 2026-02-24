import { createClient } from '@supabase/supabase-js';

// Prefer env (.env or Cloudflare). Fallback so the app works when Cloudflare build has no env (e.g. .env not in repo).
const url =
  import.meta.env.VITE_SUPABASE_URL || 'https://lglmhhykjithfypmgkxq.supabase.co';
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_21Um0v5JImpSwzcmMS90Ew_8AAqyK5R';

const fromEnv = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
console.log('[Supabase] supabase.js init', {
  hasUrl: !!url,
  hasAnonKey: !!anonKey,
  fromEnv,
});
if (!fromEnv) {
  console.warn('[Supabase] Using code fallback (env was empty at build). To use env on Cloudflare: Pages → Settings → Environment variables → add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then redeploy.');
}

export const supabase = createClient(url, anonKey);
