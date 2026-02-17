import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { PageLoader } from '../ui/Loader';

/**
 * After login: if aspirant data exists → dashboard. If no aspirant but admin data → /admin. Else → /onboarding.
 * Use around dashboard routes. Assumes user is already authenticated (use inside ProtectedRoute).
 */
export default function RequireAspirantProfile({ children }) {
  const user = useAppSelector((state) => state.auth.user);
  const aspirantProfile = useAppSelector((state) => state.aspirant.profile);
  const aspirantLoading = useAppSelector((state) => state.aspirant.loading);
  const adminProfile = useAppSelector((state) => state.admin.profile);
  const adminLoading = useAppSelector((state) => state.admin.loading);

  if (!user) return null;

  if (aspirantLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <PageLoader size="md" label="Loading your profile…" />
      </div>
    );
  }

  if (aspirantProfile) return children;

  if (adminProfile) return <Navigate to="/admin" replace />;

  if (adminLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <PageLoader size="md" label="Loading…" />
      </div>
    );
  }

  return <Navigate to="/onboarding" replace />;
}
