import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { isEmailVerified } from '../../lib/authUtils';
import { useStickyGateReady } from '../../hooks/useStickyGateReady';
import { PageLoader } from '../ui/Loader';

export default function ProtectedRoute({ children }) {
  const user = useAppSelector((state) => state.auth.user);
  const loading = useAppSelector((state) => state.auth.loading);
  const location = useLocation();
  const gateReady = useStickyGateReady(loading);

  if (!gateReady && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--nth-bg-dark))' }}>
        <PageLoader size="md" label="Loading…" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isEmailVerified(user)) {
    const email = encodeURIComponent(user.email ?? '');
    return <Navigate to={`/verify-email?email=${email}`} replace />;
  }

  return children;
}
