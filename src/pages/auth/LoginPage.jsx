import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
    try {
      const result = await dispatch(signInThunk({ email, password }));
      if (signInThunk.rejected.match(result)) {
        setMessage({ type: 'error', text: result.payload?.message ?? 'Sign in failed.' });
        setSubmitting(false);
        return;
      }
      const { data: roleData } = await supabase.rpc('get_my_role');
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
    <div className="relative min-h-screen flex flex-col bg-slate-950 overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12">
        <Link to="/" className="mb-8">
          <img src="/white-logo.png" alt="NTH Logo" className="h-15 w-auto" />
        </Link>
        <div className="w-full max-w-[400px] bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Welcome back</h1>
            <p className="text-slate-400 text-sm">Sign in to your account to continue</p>
          </div>

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
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-[hsl(var(--nth-primary))]"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-300">
                  Password
                </Label>
                <Link to="/forgot-password" className="text-xs text-slate-400 hover:text-[hsl(var(--nth-primary))] transition-colors">
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
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-[hsl(var(--nth-primary))]"
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
              className="w-full h-11 text-base font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <Link
              to="/pricing"
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              View Plans
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
