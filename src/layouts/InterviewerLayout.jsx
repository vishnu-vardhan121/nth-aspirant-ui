import { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { signOut } from '../store/slices/authSlice';
import { clearAspirantProfile } from '../store/slices/aspirantSlice';
import { clearAdminProfile } from '../store/slices/adminSlice';
import { clearInterviewerProfile } from '../store/slices/interviewerSlice';
import { HiHome, HiCalendarDays, HiAcademicCap } from 'react-icons/hi2';
import SignOutConfirmModal from '../components/SignOutConfirmModal';
import AdminNavbar from '../components/AdminNavbar';

const navLinkClass = (isActive) =>
  `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-indigo-100 text-indigo-900 shadow-[inset_4px_0_0_0_#4f46e5]'
      : 'text-slate-900 hover:bg-slate-100'
  }`;

export default function InterviewerLayout() {
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const interviewer = useAppSelector((state) => state.interviewer.profile);

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
      <aside className="w-56 shrink-0 h-full flex flex-col border-r border-slate-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-200 shrink-0">
          <Link to="/interviewer" className="flex items-center gap-2">
            <img
              src="/dark-logo.png"
              alt="Naveen Talent Hub"
              className="h-12 md:h-14 w-auto object-contain"
            />
            <span className="font-semibold text-slate-700 text-sm">Interviewer</span>
          </Link>
        </div>
        <nav className="p-2 flex-1 min-h-0 overflow-y-auto">
          <Link to="/interviewer" className={navLinkClass(isActive('/interviewer', true))}>
            <HiHome className="w-5 h-5 shrink-0" />
            Overview
          </Link>
          <Link to="/interviewer/slots" className={navLinkClass(isActive('/interviewer/slots'))}>
            <HiCalendarDays className="w-5 h-5 shrink-0" />
            My Slots
          </Link>
          <Link to="/interviewer/mocks" className={navLinkClass(isActive('/interviewer/mocks'))}>
            <HiAcademicCap className="w-5 h-5 shrink-0" />
            My Mocks
          </Link>
        </nav>
        <div className="p-3 border-t border-slate-200 shrink-0">
          <p className="text-xs text-slate-900 truncate px-2 font-medium" title={interviewer?.email}>
            {interviewer?.name ?? interviewer?.email}
          </p>
          <p className="text-xs text-slate-600 px-2 mt-0.5">Interviewer</p>
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
        <AdminNavbar subtitle="Interviewer" />
        <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6">
          <Outlet />
        </div>
      </main>

      <SignOutConfirmModal
        open={signOutConfirmOpen}
        onClose={() => setSignOutConfirmOpen(false)}
        onConfirm={performSignOut}
        title="Sign out of interviewer?"
      />
    </div>
  );
}
