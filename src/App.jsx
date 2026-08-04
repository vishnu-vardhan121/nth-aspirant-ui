import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PlanModalProvider } from './pages/dashboard/subscription';
import { GlobalNativeDateTimeInputBehavior } from './components/system/GlobalNativeDateTimeInputBehavior';
import AuthListener from './components/auth/AuthListener';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RequireAspirantProfile from './components/auth/RequireAspirantProfile';
import RequireOnboardingAccess from './components/auth/RequireOnboardingAccess';
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
import PrivacyPolicyPage from './pages/landing/legal/PrivacyPolicyPage';
import TermsConditionsPage from './pages/landing/legal/TermsConditionsPage';
import LoginPage from './pages/auth/LoginPage';
import SignUpPage from './pages/auth/SignUpPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import ConfirmEmailPage from './pages/auth/ConfirmEmailPage';
import OAuthCallbackPage from './pages/auth/OAuthCallbackPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import OnboardingPage from './pages/auth/OnboardingPage';
import OverviewPage from './pages/dashboard/overview/OverviewPage';
import JobsPage from './pages/dashboard/jobs/JobsPage';
import ApplicationsPage from './pages/dashboard/applications/ApplicationsPage';
import MocksPage from './pages/dashboard/mocks/MocksPage';
import MessagesPage from './pages/dashboard/messages/MessagesPage';
import ProfilePage from './pages/dashboard/profile/ProfilePage';
import PaymentsPage from './pages/dashboard/payments/PaymentsPage';
import AdminOverviewPage from './pages/admin/AdminOverviewPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminAdminsPage from './pages/admin/AdminAdminsPage';
import AdminJobsPage from './pages/admin/AdminJobsPage';
import AdminJobApplicantsPage from './pages/admin/AdminJobApplicantsPage';
import AdminMocksPage from './pages/admin/AdminMocksPage';
import AdminInterviewerPerformancePage from './pages/admin/AdminInterviewerPerformancePage';
import AdminMessagesPage from './pages/admin/AdminMessagesPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminLeadsPage from './pages/admin/AdminLeadsPage';
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage';
import AdminHelpDeskPage from './pages/admin/AdminHelpDeskPage';
import AdminTalentPoolPage from './pages/admin/AdminTalentPoolPage';
import AdminTodaysInterviewsPage from './pages/admin/AdminTodaysInterviewsPage';
import AdminInstituteAdsPage from './pages/admin/AdminInstituteAdsPage';
import AdminInstituteSpotlightPage from './pages/admin/AdminInstituteSpotlightPage';
import AdminCoursesPage from './pages/admin/courses/AdminCoursesPage';
import AdminCourseDetailPage from './pages/admin/courses/AdminCourseDetailPage';
import AdminCourseClassesPage from './pages/admin/courses/AdminCourseClassesPage';
import CreateJobPage from './pages/admin/CreateJobPage';
import EditJobPage from './pages/admin/EditJobPage';
import CoursesPage from './pages/dashboard/courses/CoursesPage';
import InterviewerOverviewPage from './pages/interviewer/InterviewerOverviewPage';
import InterviewerSlotsPage from './pages/interviewer/InterviewerSlotsPage';
import InterviewerMocksPage from './pages/interviewer/InterviewerMocksPage';
import InterviewerCoursesPage from './pages/interviewer/InterviewerCoursesPage';
import InterviewerMessagesPage from './pages/interviewer/InterviewerMessagesPage';
import InterviewerPerformancePage from './pages/interviewer/InterviewerPerformancePage';
import RefundPolicyPage from './pages/landing/legal/RefundPolicyPage';
import ContactPage from './pages/landing/contact/ContactPage';
import AboutPage from './pages/landing/about/AboutPage';
import SupportPage from './pages/dashboard/support/SupportPage';
import SupportRedirect from './pages/support/SupportRedirect';

function App() {
  return (
    <BrowserRouter>
      <PlanModalProvider>
      <GlobalNativeDateTimeInputBehavior />
      <ScrollToTop />
      <AuthListener />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/early-access" element={<EarlyAccessPage />} />
        <Route path="/jobs" element={<PublicJobsPage />} />
        <Route path="/jobs/:id" element={<JobDetailsPage />} />
        <Route path="/portfolio" element={<PortfolioIndex />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />
        <Route path="/guarantee" element={<Navigate to="/refund-policy" replace />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-and-conditions" element={<TermsConditionsPage />} />
        <Route path="/support" element={<SupportRedirect />} />
        <Route path="/support/*" element={<SupportRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/auth/confirm" element={<ConfirmEmailPage />} />
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <RequireOnboardingAccess>
                <OnboardingPage />
              </RequireOnboardingAccess>
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
          <Route path="interviewer-performance" element={<AdminInterviewerPerformancePage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="messages" element={<AdminMessagesPage />} />
          <Route path="leads" element={<AdminLeadsPage />} />
          <Route path="payments" element={<AdminPaymentsPage />} />
          <Route path="help-desk" element={<AdminHelpDeskPage />} />
          <Route path="talent-pool" element={<AdminTalentPoolPage />} />
          <Route path="institute-ads" element={<AdminInstituteAdsPage />} />
          <Route path="institute-spotlight" element={<AdminInstituteSpotlightPage />} />
          <Route path="todays-interviews" element={<AdminTodaysInterviewsPage />} />
          <Route path="courses" element={<AdminCoursesPage />} />
          <Route path="courses/:id/classes" element={<AdminCourseClassesPage />} />
          <Route path="courses/:id" element={<AdminCourseDetailPage />} />
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
          <Route path="courses" element={<InterviewerCoursesPage />} />
          <Route path="slots" element={<InterviewerSlotsPage />} />
          <Route path="mocks" element={<InterviewerMocksPage />} />
          <Route path="performance" element={<InterviewerPerformancePage />} />
          <Route path="messages" element={<InterviewerMessagesPage />} />
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
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="applications" element={<ApplicationsPage />} />
          <Route path="mocks" element={<MocksPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="support" element={<SupportPage />} />
        </Route>
      </Routes>
      </PlanModalProvider>
    </BrowserRouter>
  );
}

export default App;
