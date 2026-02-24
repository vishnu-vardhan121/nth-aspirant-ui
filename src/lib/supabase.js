import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Chainable noop query result: supports .then(), .maybeSingle(), .single(), .order(), .limit(), .in() */
function noopQuery(payload = { data: null, error: null }) {
  const out = { then: (f) => (typeof f === 'function' ? Promise.resolve(f(payload)) : out) };
  out.maybeSingle = () => out;
  out.single = () => out;
  out.order = () => out;
  out.limit = () => out;
  out.in = () => out;
  return out;
}

const noopSupabase = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    refreshSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    signUp: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    signOut: () => Promise.resolve(),
    resetPasswordForEmail: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    updateUser: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
  },
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      createSignedUrl: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      remove: () => Promise.resolve({ data: null, error: null }),
    }),
  },
  from: () => ({
    select: () => ({
      eq: () => noopQuery({ data: null, error: null }),
      in: () => noopQuery({ data: [], error: null }),
      order: () => ({ eq: () => noopQuery({ data: [], error: null }), limit: () => noopQuery({ data: [], error: null }) }),
      limit: () => noopQuery({ data: [], error: null }),
    }),
    update: () => ({ eq: () => ({ then: (f) => (typeof f === 'function' ? Promise.resolve(f({ error: { message: 'Supabase not configured' } })) : null) }) }),
    insert: () => ({ then: (f) => (typeof f === 'function' ? Promise.resolve(f({ error: { message: 'Supabase not configured' } })) : null) }),
    upsert: () => ({ select: () => ({ single: () => noopQuery({ data: null, error: { message: 'Supabase not configured' } }) }) }),
  }),
  rpc: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
  functions: { invoke: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) },
  channel: () => ({ on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }) }),
  removeChannel: () => {},
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
