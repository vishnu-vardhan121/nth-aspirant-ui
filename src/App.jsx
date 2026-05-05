import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GlobalNativeDateTimeInputBehavior } from './components/system/GlobalNativeDateTimeInputBehavior';
import AuthListener from './components/auth/AuthListener';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RequireAspirantProfile from './components/auth/RequireAspirantProfile';
import RequireAdminProfile from './components/auth/RequireAdminProfile';
import RequireInterviewerProfile from './components/auth/RequireInterviewerProfile';
import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout from './layouts/AdminLayout';
import InterviewerLayout from './layouts/InterviewerLayout';
import LandingPage from './pages/landing/home/LandingPage';
import EarlyAccessPage from './pages/landing/home/EarlyAccessPage';
import PublicJobsPage from './pages/landing/home/PublicJobsPage';
import JobDetailsPage from './pages/landing/home/JobDetailsPage';
import PortfolioIndex from './pages/portfolio/PortfolioIndex';
import PricingPage from './pages/pricing/pricing/PricingPage';
import LoginPage from './pages/auth/LoginPage';
import SignUpPage from './pages/auth/SignUpPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import OnboardingPage from './pages/auth/OnboardingPage';
import OverviewPage from './pages/dashboard/overview/OverviewPage';
import JobsPage from './pages/dashboard/jobs/JobsPage';
import ApplicationsPage from './pages/dashboard/applications/ApplicationsPage';
import MocksPage from './pages/dashboard/mocks/MocksPage';
import MessagesPage from './pages/dashboard/messages/MessagesPage';
import ProfilePage from './pages/dashboard/profile/ProfilePage';
import AdminOverviewPage from './pages/admin/AdminOverviewPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminAdminsPage from './pages/admin/AdminAdminsPage';
import AdminJobsPage from './pages/admin/AdminJobsPage';
import AdminJobApplicantsPage from './pages/admin/AdminJobApplicantsPage';
import AdminMocksPage from './pages/admin/AdminMocksPage';
import AdminMessagesPage from './pages/admin/AdminMessagesPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminLeadsPage from './pages/admin/AdminLeadsPage';
import AdminHelpDeskPage from './pages/admin/AdminHelpDeskPage';
import AdminTalentPoolPage from './pages/admin/AdminTalentPoolPage';
import AdminTodaysInterviewsPage from './pages/admin/AdminTodaysInterviewsPage';
import AdminInstituteAdsPage from './pages/admin/AdminInstituteAdsPage';
import AdminInstituteSpotlightPage from './pages/admin/AdminInstituteSpotlightPage';
import CreateJobPage from './pages/admin/CreateJobPage';
import EditJobPage from './pages/admin/EditJobPage';
import InterviewerOverviewPage from './pages/interviewer/InterviewerOverviewPage';
import InterviewerSlotsPage from './pages/interviewer/InterviewerSlotsPage';
import InterviewerMocksPage from './pages/interviewer/InterviewerMocksPage';
import SuccessGuaranteePage from './pages/landing/guarantee/SuccessGuaranteePage';

function App() {
  return (
    <BrowserRouter>
      <GlobalNativeDateTimeInputBehavior />
      <ScrollToTop />
      <AuthListener />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/early-access" element={<EarlyAccessPage />} />
        <Route path="/jobs" element={<PublicJobsPage />} />
        <Route path="/jobs/:id" element={<JobDetailsPage />} />
        <Route path="/portfolio" element={<PortfolioIndex />} />
        <Route path="/guarantee" element={<SuccessGuaranteePage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route path="/home" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RequireAdminProfile>
                <AdminLayout />
              </RequireAdminProfile>
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminOverviewPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="admins" element={<AdminAdminsPage />} />
          <Route path="jobs" element={<AdminJobsPage />} />
          <Route path="jobs/create" element={<CreateJobPage />} />
          <Route path="jobs/:id/edit" element={<EditJobPage />} />
          <Route path="jobs/:id/applicants" element={<AdminJobApplicantsPage />} />
          <Route path="mocks" element={<AdminMocksPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="messages" element={<AdminMessagesPage />} />
          <Route path="leads" element={<AdminLeadsPage />} />
          <Route path="help-desk" element={<AdminHelpDeskPage />} />
          <Route path="talent-pool" element={<AdminTalentPoolPage />} />
          <Route path="institute-ads" element={<AdminInstituteAdsPage />} />
          <Route path="institute-spotlight" element={<AdminInstituteSpotlightPage />} />
          <Route path="todays-interviews" element={<AdminTodaysInterviewsPage />} />
        </Route>
        <Route
          path="/interviewer"
          element={
            <ProtectedRoute>
              <RequireInterviewerProfile>
                <InterviewerLayout />
              </RequireInterviewerProfile>
            </ProtectedRoute>
          }
        >
          <Route index element={<InterviewerOverviewPage />} />
          <Route path="slots" element={<InterviewerSlotsPage />} />
          <Route path="mocks" element={<InterviewerMocksPage />} />
        </Route>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RequireAspirantProfile>
                <DashboardLayout />
              </RequireAspirantProfile>
            </ProtectedRoute>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="applications" element={<ApplicationsPage />} />
          <Route path="mocks" element={<MocksPage />} />
          <Route path="messages" element={<MessagesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
