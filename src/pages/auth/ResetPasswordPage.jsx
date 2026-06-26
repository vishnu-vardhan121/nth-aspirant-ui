import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthAlert from '../../components/auth/AuthAlert';
import { authFieldClass, authLabelClass } from '../../components/auth/authStyles';
import { MIN_PASSWORD_LENGTH, validateNewPasswordPair } from '../../lib/authUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    const hasRecovery = hash && hash.includes('type=recovery');

    if (!hasRecovery) {
      setInvalidLink(true);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    const t = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setReady(true);
        else setInvalidLink(true);
      });
    }, 2500);

    return () => {
      subscription?.unsubscribe?.();
      clearTimeout(t);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    const passwordError = validateNewPasswordPair(password, confirm);
    if (passwordError) {
      setMessage({ type: 'error', text: passwordError });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    navigate('/login?reset=1', { replace: true });
  };

  if (invalidLink) {
    return (
      <AuthLayout title="Invalid or expired link">
        <p className="mb-6 text-center text-sm text-slate-500">
          This reset link may have expired or already been used.
        </p>
        <Button asChild className="w-full" size="lg">
          <Link to="/forgot-password">Request new reset link</Link>
        </Button>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link to="/login" className="font-medium text-[hsl(var(--nth-primary))] hover:underline">
            Back to sign in
          </Link>
        </p>
      </AuthLayout>
    );
  }

  if (!ready) {
    return (
      <AuthLayout title="Set new password">
        <p className="text-center text-sm text-slate-500">Loading…</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set new password">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password" className={authLabelClass}>
            New password
          </Label>
          <Input
            id="password"
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
          <Label htmlFor="confirm" className={authLabelClass}>
            Confirm password
          </Label>
          <Input
            id="confirm"
            type="password"
            name="confirm-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="off"
            placeholder="••••••••"
            className={authFieldClass}
          />
        </div>

        {message.text ? (
          <AuthAlert type={message.type === 'error' ? 'error' : 'success'}>{message.text}</AuthAlert>
        ) : null}

        <Button type="submit" disabled={submitting} size="lg" className="w-full">
          {submitting ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </AuthLayout>
  );
}
