import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { supabase } from '../../lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    if (!email.trim()) return;
    setSubmitting(true);
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setSubmitting(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setSent(true);
    setMessage({
      type: 'success',
      text: 'If an account exists for this email, you’ll receive a link to reset your password. Check your inbox and spam.',
    });
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'rgb(var(--nth-bg-dark))' }}
    >
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-12">
        <div className="w-full max-w-md">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Forgot password</h1>
          <p className="text-slate-400 text-sm mb-8">
            Enter your email and we’ll send you a link to reset your password.
          </p>

          {sent ? (
            <div className="space-y-6">
              <div className="rounded-lg px-4 py-3 text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {message.text}
              </div>
              <p className="text-center text-sm text-slate-400">
                <Link to="/login" className="text-[hsl(var(--nth-primary))] hover:underline">
                  Back to sign in
                </Link>
              </p>
            </div>
          ) : (
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

              {message.text && message.type === 'error' && (
                <div className="rounded-lg px-4 py-3 text-sm bg-destructive/10 text-destructive border border-destructive/20">
                  {message.text}
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 text-base"
              >
                {submitting ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
          )}

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
