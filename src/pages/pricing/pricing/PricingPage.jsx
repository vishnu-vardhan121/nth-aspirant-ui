import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { HiXMark, HiEnvelope } from 'react-icons/hi2';
import { PRICING_PLANS } from '../data/pricingPlans';
import ChoiceScreen from './components/ChoiceScreen';
import PricingCards from './components/PricingCards';
import { setTrack, setPlan } from '../../../store/slices/appSlice';
import { fetchAspirantProfile } from '../../../store/slices/aspirantSlice';
import { useAppSelector } from '../../../store/hooks';
import { supabase } from '../../../lib/supabase';
import { ButtonLoader } from '../../../components/ui/Loader';
import { isEmailVerified, getSafeReturnPath } from '../../../lib/authUtils';

function BackBar({ isFirstSection, returnTo, onBackToFirst }) {
  if (isFirstSection) {
    return (
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-end px-4 sm:px-6 py-3 sm:py-4">
        <Link
          to={returnTo}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <HiXMark className="w-6 h-6 sm:w-7 sm:h-7" />
        </Link>
      </div>
    );
  }
  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-end px-4 sm:px-6 py-3 sm:py-4">
      <button
        type="button"
        onClick={onBackToFirst}
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Back to choice"
      >
        <HiXMark className="w-6 h-6 sm:w-7 sm:h-7" />
      </button>
    </div>
  );
}

function VerifyEmailBlock({ user, selectedPlanName, onResendSuccess, onResendError }) {
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState({ type: '', text: '' });

  const handleResend = async () => {
    if (!user?.email) return;
    setResendLoading(true);
    setResendMessage({ type: '', text: '' });
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
    });
    setResendLoading(false);
    if (error) {
      const text = error.message || 'Failed to resend. Try again later.';
      setResendMessage({ type: 'error', text });
      onResendError?.(error);
    } else {
      setResendMessage({
        type: 'success',
        text: 'Verification email sent. Check your inbox (and spam folder).',
      });
      onResendSuccess?.();
    }
  };

  return (
    <div className="mx-4 sm:mx-6 mb-6 p-4 sm:p-5 rounded-xl bg-amber-500/10 border border-amber-500/30">
      <div className="flex gap-3">
        <HiEnvelope className="w-6 h-6 shrink-0 text-amber-400 mt-0.5" />
        <div className="min-w-0">
          <h3 className="font-semibold text-white mb-1">Verify your email to upgrade</h3>
          <p className="text-slate-300 text-sm mb-3">
            We&apos;ve sent a link to <strong className="text-white">{user?.email}</strong>. Check your inbox and click the link, then return here to continue.
            {selectedPlanName ? ` You can then choose ${selectedPlanName}.` : ''}
          </p>
          {resendMessage.text && (
            <p
              className={`text-sm mb-3 ${
                resendMessage.type === 'error' ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {resendMessage.text}
            </p>
          )}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading}
            className="px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium text-sm border border-amber-500/40 disabled:opacity-60"
          >
            {resendLoading ? <ButtonLoader label="Sending…" /> : 'Resend verification email'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const trackParam = searchParams.get('track');
  const validTrack =
    trackParam === 'fresher' || trackParam === 'experienced' ? trackParam : null;
  const [pricingType, setPricingType] = useState(validTrack);
  const [showVerifyBlock, setShowVerifyBlock] = useState(false);
  const [selectedPlanName, setSelectedPlanName] = useState(null);
  const returnTo = useMemo(() => getSafeReturnPath(searchParams, '/'), [searchParams]);

  const plans = pricingType ? PRICING_PLANS[pricingType] : null;

  const handleSelectPlan = async (plan) => {
    if (!user?.id) {
      const from = `/pricing?from=${encodeURIComponent(returnTo)}&track=${encodeURIComponent(pricingType || 'fresher')}`;
      navigate(`/login?from=${encodeURIComponent(from)}`);
      return;
    }
    if (!isEmailVerified(user)) {
      setShowVerifyBlock(true);
      setSelectedPlanName(plan?.name ?? null);
      return;
    }
    try {
      const { error } = await supabase
        .from('aspirants')
        .update({
          track: pricingType,
          plan: plan.id,
          plan_started_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (error) throw error;
      dispatch(setTrack(pricingType));
      dispatch(setPlan(plan.id));
      dispatch(fetchAspirantProfile(user.id));
      navigate(returnTo, { replace: true });
    } catch (err) {
      console.warn('Failed to save plan:', err);
      navigate(returnTo, { replace: true });
    }
  };

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: 'rgb(var(--nth-bg-dark))' }}
    >
      <main className="flex-1 flex flex-col min-h-0 relative">
        <BackBar
          isFirstSection={pricingType === null}
          returnTo={returnTo}
          onBackToFirst={() => setPricingType(null)}
        />
        {pricingType === null ? (
          <div className="flex-1 flex flex-col pt-12 sm:pt-14">
            <ChoiceScreen onSelect={setPricingType} />
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 relative pt-12 sm:pt-14">
            {user && !isEmailVerified(user) && (
              <VerifyEmailBlock
                user={user}
                selectedPlanName={selectedPlanName}
              />
            )}
            <PricingCards plans={plans} track={pricingType} onSelectPlan={handleSelectPlan} />
          </div>
        )}
      </main>
    </div>
  );
}
