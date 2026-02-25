import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://dnkshewywsxqzoknnczm.supabase.co';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_4jy2V2VITPmrsaaLpykKRw_D0yvUPNz';

const NOT_CONFIGURED_MSG =
  'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (see .env.example).';

const notConfigured = new Proxy(
  {},
  {
    get() {
      throw new Error(NOT_CONFIGURED_MSG);
    },
  }
);

export const supabase =
  url && anonKey ? createClient(url, anonKey) : notConfigured;
