import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAppDispatch } from '../../store/hooks';
import { signIn as signInThunk } from '../../store/slices/authSlice';
import {
  getSafeReturnPath,
  getPostLoginPathForRole,
  isEmailVerified,
  isUnconfirmedEmailError,
} from '../../lib/authUtils';
import { supabase } from '../../lib/supabase';
import { signInWithGoogle } from '../../lib/googleAuth';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthAlert from '../../components/auth/AuthAlert';
import GoogleSignInButton, { AuthEmailDivider } from '../../components/auth/GoogleSignInButton';
import { authFieldClass, authLabelClass } from '../../components/auth/authStyles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HiEye, HiEyeSlash } from 'react-icons/hi2';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const returnAfterSignIn = useMemo(() => getSafeReturnPath(searchParams, '/dashboard'), [searchParams]);
  const resetSuccess = searchParams.get('reset') === '1';
  const verifiedSuccess = searchParams.get('verified') === '1';
  const signupSuccess = searchParams.get('signup') === '1';
  const [email, setEmail] = useState(() => location.state?.email ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [unconfirmedEmail, setUnconfirmedEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setMessage({ type: '', text: '' });
    setGoogleLoading(true);
    try {
      await signInWithGoogle({ returnPath: returnAfterSignIn });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Could not start Google sign in.' });
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setUnconfirmedEmail(false);
    setSubmitting(true);
    const trimmedEmail = email.trim();
    try {
      const result = await dispatch(signInThunk({ email: trimmedEmail, password }));
      if (signInThunk.rejected.match(result)) {
        const errMsg = result.payload?.message ?? 'Sign in failed.';
        if (isUnconfirmedEmailError(errMsg)) {
          setUnconfirmedEmail(true);
          setMessage({ type: 'error', text: 'Please confirm your email before signing in.' });
        } else {
          setMessage({ type: 'error', text: errMsg });
        }
        setSubmitting(false);
        return;
      }

      const user = result.payload?.user ?? null;
      if (user && !isEmailVerified(user)) {
        await supabase.auth.signOut();
        navigate(`/verify-email?email=${encodeURIComponent(trimmedEmail)}`, { replace: true });
        setSubmitting(false);
        return;
      }

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
      setMessage({ type: 'error', text: err.message || 'Something went wrong.' });
    }
    setSubmitting(false);
  };

  const showResendLink = unconfirmedEmail && email.trim();

  return (
    <AuthLayout
      title="Sign in"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-semibold text-[hsl(var(--nth-primary))] hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <GoogleSignInButton loading={googleLoading} disabled={submitting} onClick={handleGoogleSignIn} />
      <AuthEmailDivider />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className={authLabelClass}>
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
            className={authFieldClass}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password" className={authLabelClass}>
              Password
            </Label>
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-[hsl(var(--nth-primary))] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className={`${authFieldClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <HiEyeSlash className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {resetSuccess ? (
          <AuthAlert type="success">Password updated. Sign in with your new password.</AuthAlert>
        ) : null}
        {verifiedSuccess ? (
          <AuthAlert type="success">Email confirmed. You can sign in now.</AuthAlert>
        ) : null}
        {signupSuccess ? (
          <AuthAlert type="success">Account created. Sign in to continue.</AuthAlert>
        ) : null}
        {message.text ? (
          <AuthAlert
            type={message.type === 'error' ? 'error' : 'success'}
            action={
              showResendLink
                ? {
                    to: `/verify-email?email=${encodeURIComponent(email.trim())}`,
                    label: 'Resend confirmation email',
                  }
                : undefined
            }
          >
            {message.text}
          </AuthAlert>
        ) : null}

        <Button type="submit" disabled={submitting || googleLoading} size="lg" className="w-full">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
