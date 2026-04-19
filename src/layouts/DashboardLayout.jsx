import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { signOut } from '../store/slices/authSlice';
import DashboardNavbar from '../pages/dashboard/components/DashboardNavbar';
import MessageNotification from '../components/MessageNotification';
import { supabase } from '../lib/supabase';
import { playMessageSound } from '../lib/messageSound';
import {
  HiXMark,
  HiHome,
  HiUserCircle,
  HiBriefcase,
  HiClipboardDocumentList,
  HiAcademicCap,
  HiChatBubbleLeftRight,
  HiArrowRightOnRectangle,
} from 'react-icons/hi2';
import SignOutConfirmModal from '../components/SignOutConfirmModal';

const SIDEBAR_LINKS = [
  { label: 'Overview', to: '/dashboard', icon: HiHome },
  { label: 'My Profile', to: '/dashboard/profile', icon: HiUserCircle },
  { label: 'Jobs', to: '/dashboard/jobs', icon: HiBriefcase },
  { label: 'Applications', to: '/dashboard/applications', icon: HiClipboardDocumentList },
  { label: 'Mock Interviews', to: '/dashboard/mocks', icon: HiAcademicCap },
  { label: 'Messages', to: '/dashboard/messages', icon: HiChatBubbleLeftRight },
];

function SidebarContent({ user, onSignOutClick, onNavClick, showHeaderLink = true }) {
  const location = useLocation();
  const userInitial = (user?.email || '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <>
      {showHeaderLink && (
        <Link
          to="/dashboard"
          onClick={onNavClick}
          className="px-4 py-4 border-b border-white/10 bg-white/[0.02] flex items-center gap-2 shrink-0"
        >
          <img
            src="/white-logo.png"
            alt="Naveen Talent Hub"
            className="h-10 md:h-11 w-auto object-contain"
          />
        </Link>
      )}
      <nav className="flex-1 p-3.5 overflow-auto min-h-0">
        <p className="px-2.5 pb-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-slate-500">
          Navigation
        </p>
        <div className="space-y-1">
          {SIDEBAR_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.to === '/dashboard'
                ? location.pathname === '/dashboard'
                : location.pathname.startsWith(link.to);
            return (
            <Link
              key={link.to}
              to={link.to}
              onClick={onNavClick}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
                isActive
                  ? 'bg-white/[0.08] border-white/20 !text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                  : 'border-transparent !text-slate-200 hover:bg-white/7 hover:!text-white hover:border-white/10'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 border transition-colors ${
                  isActive
                    ? 'bg-white/10 text-slate-100 border-white/25'
                    : 'bg-white/[0.06] text-slate-300 border-white/15 group-hover:bg-white/12 group-hover:text-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
              </span>
              <span className="truncate">{link.label}</span>
              {isActive && <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-slate-300" />}
            </Link>
          );
        })}
        </div>
      </nav>
      <div className="p-3 border-t border-white/10 shrink-0">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-white/10 text-slate-100 text-xs font-semibold flex items-center justify-center">
              {userInitial}
            </div>
            <p className="text-xs text-slate-300 truncate font-medium" title={user?.email}>
              {user?.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onSignOutClick}
            className="mt-3 w-full px-3 py-2 rounded-lg text-sm font-medium !text-slate-100 bg-white/6 hover:bg-white/12 hover:!text-white transition-colors text-left inline-flex items-center gap-2"
          >
            <HiArrowRightOnRectangle className="w-4 h-4 shrink-0" />
            Sign out
          </button>
        </div>
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
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [messageNotification, setMessageNotification] = useState({
    show: false,
    title: '',
    bodyPreview: '',
    link: MESSAGES_PATH,
  });
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const dismissNotification = useCallback(() => {
    setMessageNotification((prev) => ({ ...prev, show: false }));
  }, []);

  const channelRef = useRef(null);

  useEffect(() => {
    if (typeof supabase.channel !== 'function') return;

    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      const uid = session?.user?.id ?? user?.id;
      if (!uid) return;

      const uidStr = String(uid);
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
                title: isBroadcast ? 'New message from Naveen Talent Hub Team' : 'New message',
                bodyPreview: bodyPreview(row.body),
                link: MESSAGES_PATH,
              };
            });
            if (window.location.pathname !== MESSAGES_PATH) playMessageSound();
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('[Realtime] messages channel error – ensure Database → Replication has table "messages" in supabase_realtime.');
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

  const performSignOut = () => {
    dispatch(signOut());
    setMobileSidebarOpen(false);
    navigate('/');
  };

  const openSignOutConfirm = () => setSignOutConfirmOpen(true);

  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  return (
    <div className="h-screen flex overflow-hidden bg-[rgb(var(--nth-bg-soft))]">
      {/* Desktop sidebar - hidden on mobile */}
      <aside
        className="hidden md:flex w-64 shrink-0 flex-col h-full overflow-hidden border-r border-[rgb(var(--nth-border-light))]"
        style={{
          background:
            'linear-gradient(180deg, #0b1220 0%, #101827 48%, #0f172a 100%)',
        }}
      >
        <SidebarContent user={user} onSignOutClick={openSignOutConfirm} onNavClick={() => {}} />
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
            className="fixed inset-y-0 left-0 z-50 w-80 max-w-[88vw] flex flex-col h-full overflow-hidden border-r border-white/10 shadow-xl md:hidden"
            style={{
              background:
                'linear-gradient(180deg, #0b1220 0%, #101827 48%, #0f172a 100%)',
            }}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
              <img
                src="/white-logo.png"
                alt="Naveen Talent Hub"
                className="h-11 w-auto object-contain"
              />
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
              onSignOutClick={openSignOutConfirm}
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

      <SignOutConfirmModal
        open={signOutConfirmOpen}
        onClose={() => setSignOutConfirmOpen(false)}
        onConfirm={performSignOut}
      />
    </div>
  );
}
