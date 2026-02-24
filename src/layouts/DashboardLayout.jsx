import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { signOut } from '../store/slices/authSlice';
import DashboardNavbar from '../pages/dashboard/components/DashboardNavbar';
import MessageNotification from '../components/MessageNotification';
import { supabase } from '../lib/supabase';
import { playMessageSound } from '../lib/messageSound';
import { HiXMark } from 'react-icons/hi2';

const SIDEBAR_LINKS = [
  { label: 'Overview', to: '/dashboard' },
  { label: 'Profile', to: '/dashboard/profile' },
  { label: 'Jobs', to: '/dashboard/jobs' },
  { label: 'My Applications', to: '/dashboard/applications' },
  { label: 'Mock Interviews', to: '/dashboard/mocks' },
  { label: 'Messages', to: '/dashboard/messages' },
];

function SidebarContent({ user, onSignOut, onNavClick, showHeaderLink = true }) {
  const location = useLocation();

  return (
    <>
      {showHeaderLink && (
        <Link
          to="/dashboard"
          onClick={onNavClick}
          className="p-4 border-b border-white/10 flex items-center gap-2 shrink-0"
        >
          <span className="nth-brand-gradient-light text-xl font-extrabold tracking-tight">
            NTH
          </span>
          <span className="text-slate-400 text-xs font-medium">Dashboard</span>
        </Link>
      )}
      <nav className="flex-1 p-3 space-y-1 overflow-auto min-h-0">
        {SIDEBAR_LINKS.map((link) => {
          const isActive =
            link.to === '/dashboard'
              ? location.pathname === '/dashboard'
              : location.pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={onNavClick}
              className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/10 shrink-0">
        <p className="text-xs text-slate-500 truncate px-3 py-1" title={user?.email}>
          {user?.email}
        </p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white transition-colors text-left"
        >
          Sign out
        </button>
      </div>
    </>
  );
}

const MESSAGES_PATH = '/dashboard/messages';

function bodyPreview(body, maxLen = 60) {
  if (!body) return '';
  const t = body.replace(/\n/g, ' ').trim();
  return t.length <= maxLen ? t : t.slice(0, maxLen) + '…';
}

export default function DashboardLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [messageNotification, setMessageNotification] = useState({
    show: false,
    title: '',
    bodyPreview: '',
    link: MESSAGES_PATH,
  });
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const dismissNotification = useCallback(() => {
    setMessageNotification((prev) => ({ ...prev, show: false }));
  }, []);

  const channelRef = useRef(null);

  useEffect(() => {
    console.log('[Supabase] DashboardLayout useEffect realtime', { hasChannel: typeof supabase.channel === 'function' });
    if (typeof supabase.channel !== 'function') return;

    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[Supabase] DashboardLayout getSession for channel', { hasSession: !!session, userId: session?.user?.id ?? user?.id });
      if (cancelled) return;
      const uid = session?.user?.id ?? user?.id;
      if (!uid) return;

      const uidStr = String(uid);
      console.log('[Supabase] DashboardLayout subscribing channel', { uidStr });
      const ch = supabase
        .channel(`dashboard-messages-${uidStr}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const row = payload?.new;
            if (!row) return;
            const rowTo = row.to_aspirant_id != null ? String(row.to_aspirant_id) : null;
            const rowFrom = row.from_aspirant_id != null ? String(row.from_aspirant_id) : null;
            const toMe = rowTo === uidStr;
            const isBroadcast = row.to_aspirant_id == null && row.from_admin_id != null;
            const isFromMe = rowFrom === uidStr;
            if (!toMe && !isBroadcast) return;
            if (isFromMe) return;
            setMessageNotification((prev) => {
              const onMessagesPage = window.location.pathname === MESSAGES_PATH;
              if (onMessagesPage) return prev;
              return {
                show: true,
                title: isBroadcast ? 'New message from NTH Team' : 'New message',
                bodyPreview: bodyPreview(row.body),
                link: MESSAGES_PATH,
              };
            });
            if (window.location.pathname !== MESSAGES_PATH) playMessageSound();
          }
        )
        .subscribe((status) => {
          console.log('[Supabase] DashboardLayout channel subscribe status', { status });
          if (status === 'CHANNEL_ERROR') {
            console.warn('[Supabase] Realtime messages channel error – ensure Database → Replication has table "messages" in supabase_realtime.');
          }
        });

      if (cancelled) {
        supabase.removeChannel(ch);
        return;
      }
      channelRef.current = ch;
    })();

    return () => {
      cancelled = true;
      const ch = channelRef.current;
      if (ch) {
        supabase.removeChannel(ch);
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  const handleSignOut = () => {
    dispatch(signOut());
    setMobileSidebarOpen(false);
    navigate('/');
  };

  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  return (
    <div className="h-screen flex overflow-hidden bg-[rgb(var(--nth-bg-soft))]">
      {/* Desktop sidebar - hidden on mobile */}
      <aside
        className="hidden md:flex w-60 shrink-0 flex-col h-full overflow-hidden border-r border-[rgb(var(--nth-border-light))]"
        style={{ backgroundColor: 'rgb(var(--nth-bg-dark))' }}
      >
        <SidebarContent user={user} onSignOut={handleSignOut} onNavClick={() => {}} />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={closeMobileSidebar}
            aria-hidden
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex flex-col h-full overflow-hidden border-r border-white/10 shadow-xl md:hidden"
            style={{ backgroundColor: 'rgb(var(--nth-bg-dark))' }}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
              <span className="nth-brand-gradient-light text-lg font-extrabold tracking-tight">
                NTH
              </span>
              <button
                type="button"
                onClick={closeMobileSidebar}
                className="p-2 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Close menu"
              >
                <HiXMark className="w-6 h-6" />
              </button>
            </div>
            <SidebarContent
              user={user}
              onSignOut={handleSignOut}
              onNavClick={closeMobileSidebar}
              showHeaderLink={false}
            />
          </aside>
        </>
      )}

      {/* Main: navbar + scrollable content */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <DashboardNavbar onMenuClick={() => setMobileSidebarOpen(true)} />
        <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6 md:p-8">
          <Outlet />
        </div>
      </main>

      <MessageNotification notification={messageNotification} onDismiss={dismissNotification} />
    </div>
  );
}
