import { Link } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { HiArrowTopRightOnSquare } from 'react-icons/hi2';

function getInitial(name, email) {
  if (name?.trim()) return name.trim().charAt(0).toUpperCase();
  if (email?.trim()) return email.trim().charAt(0).toUpperCase();
  return '?';
}

/**
 * Top bar for admin / interviewer layouts — mirrors dashboard navbar (sticky, blur).
 */
export default function AdminNavbar({ subtitle = 'Admin' }) {
  const admin = useAppSelector((state) => state.admin.profile);
  const interviewer = useAppSelector((state) => state.interviewer.profile);
  const displayName = admin?.name ?? interviewer?.name ?? admin?.email ?? '';
  const initial = getInitial(admin?.name ?? interviewer?.name, admin?.email);

  return (
    <header className="sticky top-0 z-10 shrink-0 h-14 flex items-center justify-between gap-4 px-4 md:px-6 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 hidden sm:inline">
          {subtitle}
        </span>
        <Link
          to="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <HiArrowTopRightOnSquare className="w-4 h-4 shrink-0" />
          View site
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {displayName && (
          <span className="hidden md:inline text-sm text-slate-600 truncate max-w-[200px]" title={displayName}>
            {displayName}
          </span>
        )}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0 shadow-sm"
          style={{
            background: `linear-gradient(135deg, hsl(var(--nth-primary)) 0%, hsl(var(--nth-primary-light)) 100%)`,
          }}
          title={admin?.email}
        >
          {initial}
        </div>
      </div>
    </header>
  );
}
