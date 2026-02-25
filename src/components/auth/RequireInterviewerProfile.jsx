import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { PageLoader } from '../ui/Loader';

/**
 * Only interviewers (user has interviewer profile). Else redirect to /dashboard.
 */
export default function RequireInterviewerProfile({ children }) {
  const user = useAppSelector((state) => state.auth.user);
  const interviewerProfile = useAppSelector((state) => state.interviewer.profile);
  const interviewerLoading = useAppSelector((state) => state.interviewer.loading);

  if (!user) return null;

  if (interviewerLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <PageLoader size="md" label="Loading…" />
      </div>
    );
  }

  if (!interviewerProfile) return <Navigate to="/dashboard" replace />;

  return children;
}
