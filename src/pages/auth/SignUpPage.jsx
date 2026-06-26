import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../store/hooks';
import { signUp as signUpThunk } from '../../store/slices/authSlice';
import { supabase } from '../../lib/supabase';
import { isEmailVerified, MIN_PASSWORD_LENGTH, validateNewPasswordPair } from '../../lib/authUtils';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthAlert from '../../components/auth/AuthAlert';
import { authFieldClass, authLabelClass } from '../../components/auth/authStyles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HiEye, HiEyeSlash } from 'react-icons/hi2';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    const passwordError = validateNewPasswordPair(password, confirmPassword);
    if (passwordError) {
      setMessage({ type: 'error', text: passwordError });
      return;
    }

    setSubmitting(true);
    try {
      const trimmedEmail = email.trim();
      const result = await dispatch(signUpThunk({ email: trimmedEmail, password }));
      if (signUpThunk.rejected.match(result)) {
        setMessage({ type: 'error', text: result.payload?.message ?? 'Sign up failed.' });
        setSubmitting(false);
        return;
      }

      const user = result.payload?.user ?? null;
      await supabase.auth.signOut();

      if (user && isEmailVerified(user)) {
        navigate('/login?signup=1', { replace: true, state: { email: trimmedEmail } });
        setSubmitting(false);
        return;
      }

      navigate(`/verify-email?email=${encodeURIComponent(trimmedEmail)}`, { replace: true });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Something went wrong.' });
    }
    setSubmitting(false);
  };

  return (
    <AuthLayout
      title="Create account"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[hsl(var(--nth-primary))] hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="signup-email" className={authLabelClass}>
            Email
          </Label>
          <Input
            id="signup-email"
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
          <Label htmlFor="signup-password" className={authLabelClass}>
            Password
          </Label>
          <Input
            id="signup-password"
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            placeholder="••••••••"
            className={authFieldClass}
          />
          <p className="text-xs text-slate-400">At least {MIN_PASSWORD_LENGTH} characters</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-confirm-password" className={authLabelClass}>
            Confirm password
          </Label>
          <div className="relative">
            <Input
              id="signup-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="off"
              placeholder="••••••••"
              className={`${authFieldClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? <HiEyeSlash className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {message.text ? (
          <AuthAlert type={message.type === 'error' ? 'error' : 'success'}>{message.text}</AuthAlert>
        ) : null}

        <Button type="submit" disabled={submitting} size="lg" className="w-full">
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
