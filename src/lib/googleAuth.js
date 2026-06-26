import { supabase } from './supabase';
import { getOAuthRedirectUrl, stashOAuthReturnPath } from './authUtils';

/**
 * Start Google OAuth (configured in Supabase Auth → Providers → Google).
 * @param {{ returnPath?: string }} [options]
 */
export async function signInWithGoogle({ returnPath = '/dashboard' } = {}) {
  stashOAuthReturnPath(returnPath);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getOAuthRedirectUrl(),
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error) throw error;
}
