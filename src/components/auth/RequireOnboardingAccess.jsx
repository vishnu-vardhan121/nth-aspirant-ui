import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { PageLoader } from '../ui/Loader';
import { isAspirantProfileComplete } from '../../lib/aspirantProfile';
import { isSubscriptionActive } from '../../lib/planLimits';

/** Onboarding is only available after payment approval (active plan). */
export default function RequireOnboardingAccess({ children }) {
  const user = useAppSelector((state) => state.auth.user);
  const aspirantProfile = useAppSelector((state) => state.aspirant.profile);
  const aspirantLoading = useAppSelector((state) => state.aspirant.loading);

  if (!user) return null;

  if (aspirantLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <PageLoader size="md" label="Loading…" />
      </div>
    );
  }

  if (isAspirantProfileComplete(aspirantProfile)) {
    return <Navigate to="/dashboard" replace />;
  }

  const hasActivePlan =
    aspirantProfile?.plan &&
    isSubscriptionActive(aspirantProfile.plan, aspirantProfile.plan_started_at);

  if (!hasActivePlan) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
