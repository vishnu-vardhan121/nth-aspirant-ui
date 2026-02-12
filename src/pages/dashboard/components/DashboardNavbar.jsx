import { Link, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../../store/hooks';
import { HiBell, HiChevronDown, HiBars3 } from 'react-icons/hi2';

const PLAN_LABELS = { free: 'Free', pro: 'Pro', 'pro+': 'Pro+' };
const TRACK_LABELS = { fresher: 'Fresher', experienced: 'Experienced' };

function getInitial(email) {
  if (!email) return '?';
  const first = email.trim().charAt(0).toUpperCase();
  return first || '?';
}

export default function DashboardNavbar({ onMenuClick }) {
  const location = useLocation();
  const user = useAppSelector((state) => state.auth.user);
  const plan = useAppSelector((state) => state.app.plan);
  const track = useAppSelector((state) => state.app.track);
  const pricingTo = `/pricing?from=${encodeURIComponent(location.pathname || '/')}&track=${encodeURIComponent(track || 'fresher')}`;

  const initial = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.trim().charAt(0).toUpperCase()
    : getInitial(user?.email);

  const planLabel = PLAN_LABELS[plan] ?? 'Free';
  const trackLabel = TRACK_LABELS[track] ?? 'Fresher';

  return (
    <header className="sticky top-0 z-10 shrink-0 h-14 flex items-center justify-between gap-4 px-4 md:px-6 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <button
        type="button"
        onClick={() => onMenuClick?.()}
        className="md:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        aria-label="Open menu"
      >
        <HiBars3 className="w-6 h-6" />
      </button>
      <div className="flex-1 min-w-0 md:flex-none" />

      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
            {planLabel}
          </span>
          <span className="text-slate-300">·</span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
            {trackLabel}
          </span>
        </span>

        <Link
          to={pricingTo}
          className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-[rgb(var(--nth-primary))] hover:underline"
        >
          Upgrade
          <HiChevronDown className="w-3.5 h-3.5 -rotate-90" />
        </Link>

        <button
          type="button"
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label="Notifications"
        >
          <HiBell className="w-5 h-5" />
        </button>

        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0 shadow-sm"
          style={{
            background: `linear-gradient(135deg, rgb(var(--nth-primary)) 0%, rgb(var(--nth-primary-light)) 100%)`,
          }}
          title={user?.email}
        >
          {initial}
        </div>
      </div>
    </header>
  );
}
