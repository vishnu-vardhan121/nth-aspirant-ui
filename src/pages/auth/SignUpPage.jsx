import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { useAppDispatch } from '../../store/hooks';
import { signUp as signUpThunk } from '../../store/slices/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignUpPage() {
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
      const result = await dispatch(signUpThunk({ email, password }));
      if (signUpThunk.rejected.match(result)) {
        setMessage({ type: 'error', text: result.payload?.message ?? 'Sign up failed.' });
        setSubmitting(false);
        return;
      }
      navigate('/onboarding', { replace: true });
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Sign up</h1>
          <p className="text-slate-400 text-sm mb-8">Create an account with your email and password.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="signup-email" className="text-slate-300">
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
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-[rgb(var(--nth-primary))]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password" className="text-slate-300">
                Password
              </Label>
              <Input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="••••••••"
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-[rgb(var(--nth-primary))]"
              />
              <p className="mt-1 text-xs text-slate-500">At least 6 characters</p>
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
              aria-label="Sign up"
              className="w-full h-11 text-base"
            >
              {submitting ? 'Creating account…' : 'Sign up'}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-[rgb(var(--nth-primary-light))] hover:underline font-medium">
              Sign in
            </Link>
          </p>
          <p className="mt-4 text-center">
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
