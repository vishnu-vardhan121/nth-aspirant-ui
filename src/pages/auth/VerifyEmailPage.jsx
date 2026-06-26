import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getEmailConfirmRedirectUrl } from '../../lib/authUtils';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthAlert from '../../components/auth/AuthAlert';
import { Button } from '@/components/ui/button';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email')?.trim() ?? '';
  const [message, setMessage] = useState({ type: '', text: '' });
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    if (!email) {
      setMessage({ type: 'error', text: 'Enter your email on the sign-up page to resend the link.' });
      return;
    }
    setMessage({ type: '', text: '' });
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: getEmailConfirmRedirectUrl() },
    });
    setResending(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setMessage({
      type: 'success',
      text: 'Confirmation email sent. Check your inbox and spam folder.',
    });
  };

  const subtitle = email
    ? `We sent a confirmation link to ${email}. Open it, then sign in.`
    : 'We sent a confirmation link to your email. Open it, then sign in.';

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={subtitle}
      footer={
        <>
          Already verified?{' '}
          <Link to="/login" className="font-semibold text-[hsl(var(--nth-primary))] hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
        <Mail className="h-6 w-6" aria-hidden />
      </div>

      <ol className="mb-6 space-y-3 text-sm text-slate-600">
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
            1
          </span>
          <span>Check your inbox and spam folder.</span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
            2
          </span>
          <span>Click the confirmation link in the email.</span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
            3
          </span>
          <span>Sign in to complete your profile.</span>
        </li>
      </ol>

      {message.text ? (
        <AuthAlert type={message.type === 'error' ? 'error' : 'success'}>{message.text}</AuthAlert>
      ) : null}

      {email ? (
        <Button
          type="button"
          variant="outline"
          disabled={resending}
          onClick={handleResend}
          className="mt-4 w-full"
          size="lg"
        >
          {resending ? 'Sending…' : 'Resend confirmation email'}
        </Button>
      ) : null}

      <p className="mt-6 text-center text-sm text-slate-500">
        Wrong email?{' '}
        <Link to="/signup" className="font-medium text-[hsl(var(--nth-primary))] hover:underline">
          Sign up again
        </Link>
      </p>
    </AuthLayout>
  );
}
