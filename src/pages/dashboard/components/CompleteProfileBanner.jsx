import { Link } from 'react-router-dom';
import { ONBOARDING_PATH } from '../../../lib/aspirantProfile';

export default function CompleteProfileBanner({ className = '' }) {
  return (
    <div
      className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 sm:flex sm:items-center sm:justify-between sm:gap-4 ${className}`}
      role="status"
    >
      <div>
        <p className="font-semibold text-amber-900">Complete your profile</p>
        <p className="mt-1 text-sm leading-relaxed text-amber-900/80">
          Add your experience, skills, and resume so we can schedule mock interviews with IT working
          professionals.
        </p>
      </div>
      <Link
        to={ONBOARDING_PATH}
        className="mt-3 inline-flex shrink-0 items-center justify-center rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white no-underline transition-colors hover:bg-amber-500 sm:mt-0"
      >
        Complete profile
      </Link>
    </div>
  );
}
