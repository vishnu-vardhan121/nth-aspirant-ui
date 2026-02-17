import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { PageLoader } from '../ui/Loader';

/**
 * Only admins (user has admin profile). Else redirect to /dashboard.
 */
export default function RequireAdminProfile({ children }) {
  const user = useAppSelector((state) => state.auth.user);
  const adminProfile = useAppSelector((state) => state.admin.profile);
  const adminLoading = useAppSelector((state) => state.admin.loading);

  if (!user) return null;

  if (adminLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <PageLoader size="md" label="Loading…" />
      </div>
    );
  }

  if (!adminProfile) return <Navigate to="/dashboard" replace />;

  return children;
}
