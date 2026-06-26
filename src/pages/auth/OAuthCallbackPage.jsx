import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  consumeOAuthReturnPath,
  getPostLoginPathForRole,
  readOAuthCallbackError,
} from '../../lib/authUtils';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthAlert from '../../components/auth/AuthAlert';
import { PageLoader } from '../../components/ui/Loader';
import { Button } from '@/components/ui/button';

/**
 * OAuth return URL for Google (and other providers). Add to Supabase Auth redirect URLs:
 * https://your-domain/auth/callback
 */
export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState(() => readOAuthCallbackError());

  useEffect(() => {
    const oauthError = readOAuthCallbackError();
    if (oauthError) {
      setError(oauthError);
      return undefined;
    }

    let done = false;

    const finish = async (session) => {
      if (done || !session?.user) return;
      done = true;

      try {
        const returnAfterSignIn = consumeOAuthReturnPath('/dashboard');
        const { data: roleData } = await supabase.rpc('get_my_role');
        const role = roleData?.role ?? null;
        const defaultPath = getPostLoginPathForRole(role);
        const allowedReturnPaths = ['/dashboard', '/admin', '/interviewer'];
        const useReturn =
          allowedReturnPaths.includes(returnAfterSignIn) &&
          ((role === 'aspirant' && returnAfterSignIn === '/dashboard') ||
            (role === 'admin' && returnAfterSignIn === '/admin') ||
            (role === 'interviewer' && returnAfterSignIn === '/interviewer'));

        navigate(useReturn ? returnAfterSignIn : defaultPath, { replace: true });
      } catch (err) {
        setError(err.message || 'Could not complete sign in.');
        done = false;
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        finish(session);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      finish(session);
    });

    const timeout = window.setTimeout(() => {
      if (done) return;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          finish(session);
        } else {
          setError('Sign in with Google did not complete. Please try again.');
        }
      });
    }, 8000);

    return () => {
      subscription?.unsubscribe?.();
      window.clearTimeout(timeout);
    };
  }, [navigate]);

  if (error) {
    return (
      <AuthLayout title="Sign in failed">
        <AuthAlert type="error">{error}</AuthAlert>
        <div className="mt-6 flex flex-col gap-3">
          <Button asChild size="lg" className="w-full">
            <Link to="/login">Back to sign in</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link to="/signup">Create account</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Signing you in">
      <PageLoader size="md" label="Completing Google sign in…" className="py-6" />
      <p className="mt-2 text-center text-sm text-slate-500">Please wait a moment.</p>
    </AuthLayout>
  );
}
