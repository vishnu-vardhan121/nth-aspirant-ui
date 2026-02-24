import { createClient } from '@supabase/supabase-js';

// Only from env – no code-level fallbacks. Set in .env (local) or Cloudflare Pages → Settings → Environment variables.
const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

console.log('[Supabase] supabase.js init', {
  hasUrl: !!url,
  hasAnonKey: !!anonKey,
  fromEnv: !!url && !!anonKey,
});

const NOT_CONFIGURED_MSG =
  'Supabase env missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (local) or Cloudflare Pages → Settings → Environment variables, then rebuild.';

const notConfigured = new Proxy(
  {},
  {
    get(_, prop) {
      console.error('[Supabase] env not set – access attempted:', prop);
      throw new Error(NOT_CONFIGURED_MSG);
    },
  }
);

export const supabase = url && anonKey ? createClient(url, anonKey) : notConfigured;
