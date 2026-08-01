import { Link } from 'react-router-dom';
import { useAppSelector } from '../../../store/hooks';
import { usePlanModal, useSubscriptionStatus } from '../subscription';
import { HiBell, HiChevronDown, HiBars3, HiLifebuoy } from 'react-icons/hi2';
import FreeCodingClassesOfferLink from '../../../components/FreeCodingClassesOfferLink';
import {
  getCompleteProfilePath,
  isAspirantProfileComplete,
} from '../../../lib/aspirantProfile';

const PLAN_LABELS = { base: 'Base', silver: 'Silver', gold: 'Gold' };
const TRACK_LABELS = { fresher: 'Fresher', experienced: 'Experienced' };

function getInitial(email) {
  if (!email) return '?';
  const first = email.trim().charAt(0).toUpperCase();
  return first || '?';
}

export default function DashboardNavbar({ onMenuClick }) {
  const user = useAppSelector((state) => state.auth.user);
  const aspirantProfile = useAppSelector((state) => state.aspirant.profile);
  const aspirantProfileLoaded = useAppSelector((state) => state.aspirant.profileLoaded);
  const adminProfile = useAppSelector((state) => state.admin.profile);
  const { openPlanModal } = usePlanModal();
  const { plan, track, hasActivePlan, showPlanAction } = useSubscriptionStatus();

  const needsProfile =
    aspirantProfileLoaded && !adminProfile && !isAspirantProfileComplete(aspirantProfile);
  const completeProfilePath = getCompleteProfilePath(aspirantProfile);

  const initial = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.trim().charAt(0).toUpperCase()
    : getInitial(user?.email);

  const planLabel = hasActivePlan ? (PLAN_LABELS[plan] ?? plan) : 'No plan';
  const trackLabel = track ? (TRACK_LABELS[track] ?? track) : '—';

  const handlePlanClick = () => {
    openPlanModal();
  };

  return (
    <header className="sticky top-0 z-10 shrink-0 h-14 flex items-center gap-2 px-3 sm:px-4 md:px-6 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <button
        type="button"
        onClick={() => onMenuClick?.()}
        className="md:hidden p-2.5 -ml-1 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
        aria-label="Open menu"
      >
        <HiBars3 className="w-6 h-6" />
      </button>

      {/* Mobile: offer sits in the middle so it stays readable */}
      <div className="flex flex-1 min-w-0 items-center gap-2 md:hidden">
        {needsProfile ? (
          <Link
            to={completeProfilePath}
            className="shrink-0 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-900 no-underline hover:bg-amber-100"
          >
            Complete profile
          </Link>
        ) : (
          <FreeCodingClassesOfferLink to="/dashboard/courses" compact className="max-w-full" />
        )}
      </div>

      <div className="hidden md:block flex-1 min-w-0" />

      <div className="flex items-center justify-end gap-1 sm:gap-2 shrink-0">
        {needsProfile ? (
          <Link
            to={completeProfilePath}
            className="hidden md:inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 no-underline transition hover:bg-amber-100"
          >
            Please complete your profile
          </Link>
        ) : (
          <div className="hidden md:block">
            <FreeCodingClassesOfferLink to="/dashboard/courses" size="sm" />
          </div>
        )}

        <span className="hidden lg:inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
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
            className="hidden sm:inline-flex items-center gap-1 px-2 py-2 min-h-[44px] text-xs font-semibold text-[hsl(var(--nth-primary))] hover:underline shrink-0"
          >
            {hasActivePlan ? 'Upgrade' : 'Get a plan'}
            <HiChevronDown className="w-3.5 h-3.5 -rotate-90" />
          </button>
        ) : null}

        <Link
          to="/support"
          className="inline-flex items-center justify-center rounded-lg min-h-[44px] min-w-[44px] text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          title="Help & support"
          aria-label="Help and support"
        >
          <HiLifebuoy className="w-5 h-5 text-[hsl(var(--nth-primary))]" />
        </Link>

        <button
          type="button"
          className="hidden sm:flex p-2.5 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
          aria-label="Notifications"
        >
          <HiBell className="w-5 h-5" />
        </button>

        <Link
          to="/dashboard/profile"
          className={`relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full text-sm sm:text-base font-bold leading-none text-white shadow-md transition-colors ${
            needsProfile
              ? 'bg-amber-600 ring-2 ring-amber-200 hover:bg-amber-500'
              : 'bg-indigo-600 ring-2 ring-indigo-100 hover:bg-indigo-700'
          }`}
          title={needsProfile ? 'Please complete your profile' : 'My profile'}
          aria-label={needsProfile ? 'Please complete your profile' : 'My profile'}
        >
          <span className="select-none text-white">{initial}</span>
          {needsProfile ? (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
          ) : null}
        </Link>
      </div>
    </header>
  );
}
