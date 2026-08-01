import { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { signOut } from '../store/slices/authSlice';
import { clearAspirantProfile } from '../store/slices/aspirantSlice';
import { clearAdminProfile } from '../store/slices/adminSlice';
import { clearInterviewerProfile } from '../store/slices/interviewerSlice';
import { HiHome, HiBriefcase, HiUsers, HiUserGroup, HiAcademicCap, HiCog6Tooth, HiChatBubbleBottomCenterText, HiClipboardDocumentList, HiCalendarDays, HiPhoto, HiQueueList, HiLifebuoy, HiBanknotes, HiChartBar, HiBookOpen } from 'react-icons/hi2';
import SignOutConfirmModal from '../components/SignOutConfirmModal';
import AdminNavbar from '../components/AdminNavbar';
import { useAdminInboxUnread } from '../hooks/useAdminInboxUnread';

const navLinkClass = (isActive) =>
  `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors admin-sidebar-link ${
    isActive
      ? 'bg-indigo-100 text-indigo-900 shadow-[inset_4px_0_0_0_#4f46e5]'
      : 'text-slate-900 hover:bg-slate-100'
  }`;

export default function AdminLayout() {
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const admin = useAppSelector((state) => state.admin.profile);
  const { messagesUnread, helpDeskUnread } = useAdminInboxUnread();

  const isActive = (path, exact) =>
    exact ? location.pathname === path : location.pathname === path || location.pathname.startsWith(path + '/');

  const performSignOut = () => {
    dispatch(signOut());
    dispatch(clearAspirantProfile());
    dispatch(clearAdminProfile());
    dispatch(clearInterviewerProfile());
    navigate('/');
  };

  return (
    <div className="h-screen flex overflow-hidden bg-slate-100">
      <aside className="admin-sidebar w-56 shrink-0 h-full flex flex-col border-r border-slate-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-200 shrink-0">
          <Link to="/admin" className="flex items-center gap-2">
            <img
              src="/dark-logo.png"
              alt="Naveen Talent Hub"
              className="h-12 md:h-14 w-auto object-contain"
            />
          </Link>
        </div>
        <nav className="nth-scroll-y flex-1 min-h-0 overflow-x-hidden overflow-y-auto p-2">
          <Link
            to="/admin"
            className={navLinkClass(isActive('/admin', true))}
          >
            <HiHome className="w-5 h-5 shrink-0" />
            Overview
          </Link>
          <Link
            to="/admin/jobs"
            className={navLinkClass(isActive('/admin/jobs'))}
          >
            <HiBriefcase className="w-5 h-5 shrink-0" />
            Jobs
          </Link>
          <Link
            to="/admin/users"
            className={navLinkClass(isActive('/admin/users'))}
          >
            <HiUsers className="w-5 h-5 shrink-0" />
            Users
          </Link>
          <Link
            to="/admin/mocks"
            className={navLinkClass(isActive('/admin/mocks'))}
          >
            <HiAcademicCap className="w-5 h-5 shrink-0" />
            Mocks
          </Link>
          <Link
            to="/admin/courses"
            className={navLinkClass(isActive('/admin/courses'))}
          >
            <HiBookOpen className="w-5 h-5 shrink-0" />
            AI/ML courses
          </Link>
          {admin?.role === 'super admin' && (
            <Link
              to="/admin/interviewer-performance"
              className={navLinkClass(isActive('/admin/interviewer-performance'))}
            >
              <HiChartBar className="w-5 h-5 shrink-0" />
              Interviewer stats
            </Link>
          )}
          <Link
            to="/admin/admins"
            className={navLinkClass(isActive('/admin/admins'))}
          >
            <HiUserGroup className="w-5 h-5 shrink-0" />
            Admins
          </Link>
          <Link
            to="/admin/messages"
            className={`${navLinkClass(isActive('/admin/messages'))} justify-between`}
          >
            <span className="flex items-center gap-2">
              <HiChatBubbleBottomCenterText className="w-5 h-5 shrink-0" />
              Messages
            </span>
            {messagesUnread > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-semibold text-white">
                {messagesUnread > 99 ? '99+' : messagesUnread}
              </span>
            ) : null}
          </Link>
          <Link
            to="/admin/leads"
            className={navLinkClass(isActive('/admin/leads'))}
          >
            <HiClipboardDocumentList className="w-5 h-5 shrink-0" />
            Leads
          </Link>
          <Link
            to="/admin/payments"
            className={navLinkClass(isActive('/admin/payments'))}
          >
            <HiBanknotes className="w-5 h-5 shrink-0" />
            Payments
          </Link>
          <Link
            to="/admin/help-desk"
            className={`${navLinkClass(isActive('/admin/help-desk'))} justify-between`}
          >
            <span className="flex items-center gap-2">
              <HiLifebuoy className="w-5 h-5 shrink-0" />
              Help desk
            </span>
            {helpDeskUnread > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-semibold text-white">
                {helpDeskUnread > 99 ? '99+' : helpDeskUnread}
              </span>
            ) : null}
          </Link>
          <Link
            to="/admin/talent-pool"
            className={navLinkClass(isActive('/admin/talent-pool'))}
          >
            <HiQueueList className="w-5 h-5 shrink-0" />
            Matching (profiles)
          </Link>
          <Link
            to="/admin/institute-ads"
            className={navLinkClass(isActive('/admin/institute-ads'))}
          >
            <HiPhoto className="w-5 h-5 shrink-0" />
            Institute ads
          </Link>
          <Link
            to="/admin/institute-spotlight"
            className={navLinkClass(isActive('/admin/institute-spotlight'))}
          >
            <HiAcademicCap className="w-5 h-5 shrink-0" />
            Institute spotlight
          </Link>
          <Link
            to="/admin/todays-interviews"
            className={navLinkClass(isActive('/admin/todays-interviews'))}
          >
            <HiCalendarDays className="w-5 h-5 shrink-0" />
            Hero interviews
          </Link>
          <Link
            to="/admin/settings"
            className={navLinkClass(isActive('/admin/settings'))}
          >
            <HiCog6Tooth className="w-5 h-5 shrink-0" />
            Settings
          </Link>
        </nav>
        <div className="p-3 border-t border-slate-200 shrink-0">
          <p className="text-xs text-slate-900 truncate px-2 font-medium" title={admin?.email}>
            {admin?.name ?? admin?.email}
          </p>
          <p className="text-xs text-slate-600 px-2 mt-0.5">{admin?.role ?? 'admin'}</p>
          <button
            type="button"
            onClick={() => setSignOutConfirmOpen(true)}
            className="mt-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <AdminNavbar subtitle="Admin" />
        <div className="nth-scroll-y flex-1 min-h-0 min-w-0 overflow-x-hidden p-4 sm:p-6">
          <Outlet />
        </div>
      </main>

      <SignOutConfirmModal
        open={signOutConfirmOpen}
        onClose={() => setSignOutConfirmOpen(false)}
        onConfirm={performSignOut}
        title="Sign out of admin?"
      />
    </div>
  );
}
