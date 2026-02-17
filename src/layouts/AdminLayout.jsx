import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { signOut } from '../store/slices/authSlice';
import { clearAspirantProfile } from '../store/slices/aspirantSlice';
import { clearAdminProfile } from '../store/slices/adminSlice';
import { HiHome, HiBriefcase, HiUsers, HiUserGroup, HiAcademicCap, HiCog6Tooth, HiChatBubbleBottomCenterText } from 'react-icons/hi2';

const navLinkClass = (isActive) =>
  `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors admin-sidebar-link ${
    isActive
      ? 'bg-indigo-100 text-indigo-900 shadow-[inset_4px_0_0_0_#4f46e5]'
      : 'text-slate-900 hover:bg-slate-100'
  }`;

export default function AdminLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const admin = useAppSelector((state) => state.admin.profile);

  const isActive = (path, exact) =>
    exact ? location.pathname === path : location.pathname === path || location.pathname.startsWith(path + '/');

  const handleSignOut = () => {
    dispatch(signOut());
    dispatch(clearAspirantProfile());
    dispatch(clearAdminProfile());
    navigate('/');
  };

  return (
    <div className="h-screen flex overflow-hidden bg-slate-100">
      <aside className="admin-sidebar w-56 shrink-0 h-full flex flex-col border-r border-slate-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-200 shrink-0">
          <span className="font-bold text-slate-900">NTH Admin</span>
        </div>
        <nav className="p-2 flex-1 min-h-0 overflow-y-auto">
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
            to="/admin/admins"
            className={navLinkClass(isActive('/admin/admins'))}
          >
            <HiUserGroup className="w-5 h-5 shrink-0" />
            Admins
          </Link>
          <Link
            to="/admin/messages"
            className={navLinkClass(isActive('/admin/messages'))}
          >
            <HiChatBubbleBottomCenterText className="w-5 h-5 shrink-0" />
            Messages
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
            onClick={handleSignOut}
            className="mt-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 min-h-0 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
