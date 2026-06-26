import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { supabase } from '../../lib/supabase';
import { hasEmailConfirmationCallback, isEmailVerified } from '../../lib/authUtils';
import { PageLoader } from '../../components/ui/Loader';
import { Button } from '@/components/ui/button';

/**
 * Landing page for Supabase signup confirmation links.
 * After the link is processed, signs the user out and sends them to login (then onboarding).
 */
export default function ConfirmEmailPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | success | invalid

  useEffect(() => {
    if (!hasEmailConfirmationCallback()) {
      setStatus('invalid');
      return;
    }

    let done = false;
    const finish = async (user) => {
      if (done) return;
      if (!user || !isEmailVerified(user)) return;
      done = true;
      await supabase.auth.signOut();
      setStatus('success');
      window.setTimeout(() => {
        navigate('/login?verified=1', { replace: true });
      }, 1800);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        finish(session?.user ?? null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      finish(session?.user ?? null);
    });

    const t = window.setTimeout(() => {
      if (done) return;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user && isEmailVerified(session.user)) {
          finish(session.user);
        } else {
          setStatus('invalid');
        }
      });
    }, 4000);

    return () => {
      subscription?.unsubscribe?.();
      window.clearTimeout(t);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'rgb(var(--nth-bg-dark))' }}>
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-12">
        <div className="w-full max-w-md text-center">
          {status === 'loading' && (
            <>
              <PageLoader size="lg" label="Confirming your email…" className="py-8" />
              <p className="mt-4 text-sm text-slate-400">Please wait while we verify your link.</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30">
                <svg className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Email confirmed</h1>
              <p className="text-slate-400 text-sm">Redirecting you to sign in…</p>
            </>
          )}
          {status === 'invalid' && (
            <>
              <h1 className="text-2xl font-bold text-white mb-2">Link expired or invalid</h1>
              <p className="text-slate-400 text-sm mb-8">
                This confirmation link may have expired. Request a new one or sign in if you already confirmed.
              </p>
              <div className="flex flex-col gap-3">
                <Button asChild className="w-full h-11">
                  <Link to="/verify-email">Resend confirmation email</Link>
                </Button>
                <Button asChild variant="outline" className="w-full h-11 border-white/15 bg-white/5 text-white hover:bg-white/10">
                  <Link to="/login">Sign in</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
