import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthAlert from '../../components/auth/AuthAlert';
import { authFieldClass, authLabelClass } from '../../components/auth/authStyles';
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
      text: 'If an account exists for this email, you’ll receive a reset link. Check your inbox and spam.',
    });
  };

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="Enter your email and we’ll send you a reset link."
      footer={
        <Link to="/login" className="font-semibold text-[hsl(var(--nth-primary))] hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <AuthAlert type="success">{message.text}</AuthAlert>
      ) : (
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

          {message.text && message.type === 'error' ? (
            <AuthAlert type="error">{message.text}</AuthAlert>
          ) : null}

          <Button type="submit" disabled={submitting} size="lg" className="w-full">
            {submitting ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
