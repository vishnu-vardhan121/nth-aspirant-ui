import { createClient } from '@supabase/supabase-js';

// Use env at build time (Cloudflare injects these); fallback so connection works even if env is empty
const url =
  import.meta.env.VITE_SUPABASE_URL || 'https://lglmhhykjithfypmgkxq.supabase.co';
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_21Um0v5JImpSwzcmMS90Ew_8AAqyK5R';

console.log('[Supabase] supabase.js init', {
  url,
  hasAnonKey: !!anonKey,
  anonKeyLen: anonKey?.length ?? 0,
  fromEnv: {
    url: !!import.meta.env.VITE_SUPABASE_URL,
    key: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
});

// If your anon key is different, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env or Cloudflare env vars
export const supabase = createClient(url, anonKey);
