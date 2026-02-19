import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const noopSupabase = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    signUp: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    signOut: () => Promise.resolve(),
  },
  from: () => ({ select: () => ({ eq: () => ({ then: (f) => f({ data: [], error: null }) }), update: () => ({ eq: () => ({ then: (f) => f({ error: { message: 'Supabase not configured' } }) }) }), insert: () => ({ then: (f) => f({ error: { message: 'Supabase not configured' } }) }) }) }),
  rpc: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
  functions: { invoke: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) },
};

let supabase;
try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } else {
    supabase = noopSupabase;
  }
} catch (e) {
  supabase = noopSupabase;
}

export { supabase };
