import { createClient } from '@supabase/supabase-js';

// Hardcoded fallback per user request; remove when Cloudflare env vars are set.
const FALLBACK_URL = 'https://dnkshewywsxqzoknnczm.supabase.co';
const FALLBACK_ANON_KEY = 'sb_publishable_4jy2V2VITPmrsaaLpykKRw_D0yvUPNz';

const url = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

const mask = (val = '') => {
  if (!val) return 'EMPTY';
  if (val.length <= 12) return `${val.slice(0, 3)}…${val.slice(-3)}`;
  return `${val.slice(0, 8)}…${val.slice(-4)}`;
};

console.log('[Supabase] supabase.js init', {
  hasUrl: !!url,
  hasAnonKey: !!anonKey,
  fromEnv: !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
  urlMasked: mask(url),
  anonKeyMasked: mask(anonKey),
});

export const supabase = createClient(url, anonKey);
