import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';

export default function ProtectedRoute({ children }) {
  const user = useAppSelector((state) => state.auth.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
