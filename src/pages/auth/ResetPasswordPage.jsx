import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { supabase } from '../../lib/supabase';
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
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (password !== confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
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
      <div
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: 'rgb(var(--nth-bg-dark))' }}
      >
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-12">
          <div className="w-full max-w-md text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Invalid or expired link</h1>
            <p className="text-slate-400 text-sm mb-6">
              This reset link may have expired or already been used. Request a new one below.
            </p>
            <Button asChild className="w-full">
              <Link to="/forgot-password">Request new reset link</Link>
            </Button>
            <p className="mt-6">
              <Link to="/login" className="text-sm text-slate-500 hover:text-slate-400">
                ← Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: 'rgb(var(--nth-bg-dark))' }}
      >
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'rgb(var(--nth-bg-dark))' }}
    >
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-12">
        <div className="w-full max-w-md">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Set new password</h1>
          <p className="text-slate-400 text-sm mb-8">
            Enter your new password below.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">
                New password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="••••••••"
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-[hsl(var(--nth-primary))]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-slate-300">
                Confirm password
              </Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="••••••••"
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-[hsl(var(--nth-primary))]"
              />
            </div>

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
              className="w-full h-11 text-base"
            >
              {submitting ? 'Updating…' : 'Update password'}
            </Button>
          </form>

          <p className="mt-8 text-center">
            <Link to="/login" className="text-sm text-slate-500 hover:text-slate-400 transition-colors">
              ← Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
