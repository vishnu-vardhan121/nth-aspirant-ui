import { Link } from 'react-router-dom';
import { ONBOARDING_PATH, getAspirantProfileIncompleteReasons, getOnboardingPathForProfile } from '../../../lib/aspirantProfile';

export default function CompleteProfileBanner({ profile, className = '' }) {
  const missing = getAspirantProfileIncompleteReasons(profile);
  const onboardingPath = profile ? getOnboardingPathForProfile(profile) : ONBOARDING_PATH;
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
          {missing.length > 0 ? (
            <span className="mt-2 block">
              Still needed: {missing.join(', ')}.
            </span>
          ) : null}
        </p>
      </div>
      <Link
        to={onboardingPath}
        className="mt-3 inline-flex w-full shrink-0 items-center justify-center rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white no-underline transition-colors hover:bg-amber-500 sm:mt-0 sm:w-auto"
      >
        Complete profile
      </Link>
    </div>
  );
}
