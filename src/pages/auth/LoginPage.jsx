import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { useAppDispatch } from '../../store/hooks';
import { signIn as signInThunk, signUp as signUpThunk } from '../../store/slices/authSlice';
import { getSafeReturnPath } from '../../lib/authUtils';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const returnAfterSignIn = useMemo(() => getSafeReturnPath(searchParams, '/dashboard'), [searchParams]);
  const returnAfterSignUp = useMemo(() => getSafeReturnPath(searchParams, '/onboarding'), [searchParams]);
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setSubmitting(true);

    try {
      if (mode === 'signin') {
        const result = await dispatch(signInThunk({ email, password }));
        if (signInThunk.rejected.match(result)) {
          setMessage({ type: 'error', text: result.payload?.message ?? 'Sign in failed.' });
          setSubmitting(false);
          return;
        }
        navigate(returnAfterSignIn, { replace: true });
      } else {
        if (password !== confirmPassword) {
          setMessage({ type: 'error', text: 'Passwords do not match.' });
          setSubmitting(false);
          return;
        }
        const { data: slotData } = await supabase.rpc('try_signup_slot');
        if (!slotData?.ok) {
          setMessage({ type: 'error', text: slotData?.error ?? 'Daily signup limit reached. Try again tomorrow.' });
          setSubmitting(false);
          return;
        }
        const result = await dispatch(signUpThunk({ email, password }));
        if (signUpThunk.rejected.match(result)) {
          setMessage({ type: 'error', text: result.payload?.message ?? 'Sign up failed.' });
          setSubmitting(false);
          return;
        }
        setMessage({
          type: 'success',
          text: 'Account created. Check your email to verify, then sign in.',
        });
        navigate(returnAfterSignUp, { replace: true });
      }
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </h1>
          <p className="text-slate-400 text-sm mb-8">
            {mode === 'signin'
              ? 'Use your email and password to sign in.'
              : 'Sign up with your email to get started.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--nth-primary))] focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--nth-primary))] focus:border-transparent"
                placeholder="••••••••"
              />
              {mode === 'signup' && (
                <p className="mt-1.5 text-xs text-slate-500">At least 6 characters</p>
              )}
            </div>

            {mode === 'signup' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--nth-primary))] focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            )}

            {message.text && (
              <div
                className={`rounded-lg px-4 py-3 text-sm ${
                  message.type === 'error'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="nth-btn-primary w-full py-3 rounded-xl text-base font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting
                ? 'Please wait…'
                : mode === 'signin'
                  ? 'Sign in'
                  : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-400 text-sm">
            {mode === 'signin' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-[rgb(var(--nth-primary-light))] hover:underline font-medium"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-[rgb(var(--nth-primary-light))] hover:underline font-medium"
                >
                  Sign in
                </button>
              </>
            )}
          </p>

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
