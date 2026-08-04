import { Navigate, useLocation } from 'react-router-dom';

/** Legacy /support → dashboard help inbox */
export default function SupportRedirect() {
  const location = useLocation();
  return <Navigate to={`/dashboard/support${location.search || ''}`} replace />;
}
