import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthListener from './components/auth/AuthListener';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import LandingPage from './pages/landing/home/LandingPage';
import PricingPage from './pages/pricing/pricing/PricingPage';
import LoginPage from './pages/auth/LoginPage';
import OverviewPage from './pages/dashboard/overview/OverviewPage';
import JobsPage from './pages/dashboard/jobs/JobsPage';
import ApplicationsPage from './pages/dashboard/applications/ApplicationsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthListener />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/home" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="applications" element={<ApplicationsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
