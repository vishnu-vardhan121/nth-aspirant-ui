import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { PageLoader } from '../ui/Loader';

/**
 * Only interviewers (user has interviewer profile). Else redirect to /admin if admin, otherwise /dashboard.
 */
export default function RequireInterviewerProfile({ children }) {
  const user = useAppSelector((state) => state.auth.user);
  const interviewerProfile = useAppSelector((state) => state.interviewer.profile);
  const interviewerLoading = useAppSelector((state) => state.interviewer.loading);
  const adminProfile = useAppSelector((state) => state.admin.profile);
  const adminLoading = useAppSelector((state) => state.admin.loading);

  if (!user) return null;

  if (interviewerLoading || adminLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <PageLoader size="md" label="Loading…" />
      </div>
    );
  }

  if (!interviewerProfile) {
    return <Navigate to={adminProfile ? '/admin' : '/dashboard'} replace />;
  }

  return children;
}
