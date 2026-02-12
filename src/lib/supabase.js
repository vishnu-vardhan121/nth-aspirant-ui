import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Stub when env is missing so the app still mounts (e.g. on Vercel without env vars). */
const noopSupabase = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    signUp: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    signOut: () => Promise.resolve(),
  },
};

let supabase;
try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } else {
    console.warn(
      'Supabase env missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel project settings.'
    );
    supabase = noopSupabase;
  }
} catch (e) {
  console.warn('Supabase init failed:', e);
  supabase = noopSupabase;
}

export { supabase };
