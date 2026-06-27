import { Link } from 'react-router-dom';
import { useAppSelector } from '../../../store/hooks';
import { usePlanModal, useSubscriptionStatus } from '../subscription';
import { HiBell, HiChevronDown, HiBars3 } from 'react-icons/hi2';

const PLAN_LABELS = { base: 'Base', silver: 'Silver', gold: 'Gold' };
const TRACK_LABELS = { fresher: 'Fresher', experienced: 'Experienced' };

function getInitial(email) {
  if (!email) return '?';
  const first = email.trim().charAt(0).toUpperCase();
  return first || '?';
}

export default function DashboardNavbar({ onMenuClick }) {
  const user = useAppSelector((state) => state.auth.user);
  const { openPlanModal } = usePlanModal();
  const { plan, track, hasActivePlan, showPlanAction } = useSubscriptionStatus();

  const initial = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.trim().charAt(0).toUpperCase()
    : getInitial(user?.email);

  const planLabel = hasActivePlan ? (PLAN_LABELS[plan] ?? plan) : 'No plan';
  const trackLabel = track ? (TRACK_LABELS[track] ?? track) : '—';

  const handlePlanClick = () => {
    openPlanModal();
  };

  return (
    <header className="sticky top-0 z-10 shrink-0 h-14 flex items-center justify-between gap-4 px-4 md:px-6 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <button
        type="button"
        onClick={() => onMenuClick?.()}
        className="md:hidden p-2.5 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        aria-label="Open menu"
      >
        <HiBars3 className="w-6 h-6" />
      </button>
      <div className="flex-1 min-w-0 md:flex-none" />

      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <span
            className={`px-2 py-0.5 rounded-md ${
              hasActivePlan ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/80'
            }`}
          >
            {planLabel}
          </span>
          {track ? (
            <>
              <span className="text-slate-300">·</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">{trackLabel}</span>
            </>
          ) : null}
        </span>

        {showPlanAction ? (
          <button
            type="button"
            onClick={handlePlanClick}
            className="inline-flex items-center gap-1 px-2.5 py-2 min-h-[44px] text-xs font-semibold text-[hsl(var(--nth-primary))] hover:underline"
          >
            {hasActivePlan ? 'Upgrade' : 'Get a plan'}
            <HiChevronDown className="w-3.5 h-3.5 -rotate-90" />
          </button>
        ) : null}

        <button
          type="button"
          className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label="Notifications"
        >
          <HiBell className="w-5 h-5" />
        </button>

        <Link
          to="/dashboard/profile"
          className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0 shadow-sm transition-opacity hover:opacity-90"
          style={{
            background: `linear-gradient(135deg, hsl(var(--nth-primary)) 0%, hsl(var(--nth-primary-light)) 100%)`,
          }}
          title="My profile"
          aria-label="My profile"
        >
          {initial}
        </Link>
      </div>
    </header>
  );
}
