import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { useAppDispatch } from '../../store/hooks';
import { signIn as signInThunk } from '../../store/slices/authSlice';
import { getSafeReturnPath } from '../../lib/authUtils';
import { supabase } from '../../lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function getDefaultPathForRole(role) {
  if (role === 'aspirant') return '/dashboard';
  if (role === 'admin') return '/admin';
  if (role === 'interviewer') return '/interviewer';
  return '/onboarding';
}

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const returnAfterSignIn = useMemo(() => getSafeReturnPath(searchParams, '/dashboard'), [searchParams]);
  const resetSuccess = searchParams.get('reset') === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setSubmitting(true);
    console.log('[Supabase] LoginPage handleSubmit start');
    try {
      const result = await dispatch(signInThunk({ email, password }));
      console.log('[Supabase] LoginPage signInThunk result', { rejected: signInThunk.rejected.match(result) });
      if (signInThunk.rejected.match(result)) {
        setMessage({ type: 'error', text: result.payload?.message ?? 'Sign in failed.' });
        setSubmitting(false);
        return;
      }
      console.log('[Supabase] LoginPage calling supabase.rpc get_my_role');
      const { data: roleData, error: rpcError } = await supabase.rpc('get_my_role');
      console.log('[Supabase] LoginPage get_my_role result', { roleData, rpcError: rpcError?.message });
      const role = roleData?.role ?? null;
      const defaultPath = getDefaultPathForRole(role);
      const allowedReturnPaths = ['/dashboard', '/admin', '/interviewer'];
      const useReturn =
        allowedReturnPaths.includes(returnAfterSignIn) &&
        ((role === 'aspirant' && returnAfterSignIn === '/dashboard') ||
          (role === 'admin' && returnAfterSignIn === '/admin') ||
          (role === 'interviewer' && returnAfterSignIn === '/interviewer'));
      navigate(useReturn ? returnAfterSignIn : defaultPath, { replace: true });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Something went wrong.' });
    }
    setSubmitting(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'rgb(var(--nth-bg-dark))' }}
    >
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-12">
        <div className="w-full max-w-md">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Sign in</h1>
          <p className="text-slate-400 text-sm mb-8">Use your email and password to sign in.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-[rgb(var(--nth-primary))]"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-300">
                  Password
                </Label>
                <Link to="/forgot-password" className="text-xs text-slate-400 hover:text-[rgb(var(--nth-primary))] transition-colors">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-[rgb(var(--nth-primary))]"
              />
            </div>

            {resetSuccess && (
              <div className="rounded-lg px-4 py-3 text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Password updated. Sign in with your new password.
              </div>
            )}
            {message.text && (
              <div
                className={`rounded-lg px-4 py-3 text-sm ${
                  message.type === 'error'
                    ? 'bg-destructive/10 text-destructive border border-destructive/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {message.text}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              aria-label="Sign in"
              className="w-full h-11 text-base"
            >
              {submitting ? 'Please wait…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-8 text-center">
            <Link
              to="/"
              className="text-sm text-slate-500 hover:text-slate-400 transition-colors"
            >
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
