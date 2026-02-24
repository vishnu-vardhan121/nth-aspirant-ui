import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

const NOT_CONFIGURED_MSG =
  'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment variables and rebuild.';

const mask = (val = '') => {
  if (!val) return 'EMPTY';
  if (val.length <= 12) return `${val.slice(0, 3)}…${val.slice(-3)}`;
  return `${val.slice(0, 8)}…${val.slice(-4)}`;
};

const notConfigured = new Proxy(
  {},
  {
    get() {
      throw new Error(NOT_CONFIGURED_MSG);
    },
  }
);

console.log('[Supabase] supabase.js init', {
  hasUrl: !!url,
  hasAnonKey: !!anonKey,
  fromEnv: !!(url && anonKey),
  urlMasked: mask(url),
  anonKeyMasked: mask(anonKey),
});

export const supabase = url && anonKey ? createClient(url, anonKey) : notConfigured;
