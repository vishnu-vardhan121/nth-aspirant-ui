import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { PageLoader } from '../ui/Loader';

/**
 * Dashboard gate: aspirants can browse, pay, and explore before profile is complete.
 * Onboarding is prompted via celebration modal and in-page CTAs — not forced here.
 */
export default function RequireAspirantProfile({ children }) {
  const user = useAppSelector((state) => state.auth.user);
  const aspirantLoading = useAppSelector((state) => state.aspirant.loading);
  const aspirantProfile = useAppSelector((state) => state.aspirant.profile);
  const adminProfile = useAppSelector((state) => state.admin.profile);
  const adminLoading = useAppSelector((state) => state.admin.loading);
  const interviewerProfile = useAppSelector((state) => state.interviewer.profile);
  const interviewerLoading = useAppSelector((state) => state.interviewer.loading);

  if (!user) return null;

  if (aspirantLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <PageLoader size="md" label="Loading your profile…" />
      </div>
    );
  }

  if (interviewerProfile) return <Navigate to="/interviewer" replace />;
  if (adminProfile) return <Navigate to="/admin" replace />;

  // Only resolve admin/interviewer when there is no aspirant row (role could be staff).
  if (!aspirantProfile && (adminLoading || interviewerLoading)) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <PageLoader size="md" label="Loading…" />
      </div>
    );
  }

  return children;
}
