import { useState, useEffect, useCallback } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { signOut } from '../store/slices/authSlice';
import DashboardNavbar from '../pages/dashboard/components/DashboardNavbar';
import MessageNotification from '../components/MessageNotification';
import BrowserNotificationPrompt from '../components/BrowserNotificationPrompt';
import { supabase } from '../lib/supabase';
import { playMessageSound, primeMessageSound } from '../lib/messageSound';
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  showIncomingAspirantMessageNotification,
  subscribeToNotificationNavigate,
} from '../lib/browserNotifications';
import { subscribeToAspirantMessages } from '../lib/messageRealtime';
import {
  HiXMark,
  HiHome,
  HiUserCircle,
  HiBriefcase,
  HiClipboardDocumentList,
  HiAcademicCap,
  HiChatBubbleLeftRight,
  HiCreditCard,
  HiArrowRightOnRectangle,
} from 'react-icons/hi2';
import SignOutConfirmModal from '../components/SignOutConfirmModal';
import { usePlanModal } from '../pages/dashboard/subscription';
import { usePlanActivationCelebration } from '../pages/dashboard/subscription/hooks/usePlanActivationCelebration';
import { usePaymentRejectionNotice } from '../pages/dashboard/subscription/hooks/usePaymentRejectionNotice';
import PlanActivatedCelebration from '../pages/dashboard/subscription/components/PlanActivatedCelebration';
import PaymentRejectedModal from '../pages/dashboard/subscription/components/PaymentRejectedModal';
import { isPlanActivationMessage } from '../lib/paymentActivationRealtime';
import { isAspirantProfileComplete, needsAspirantContactDetails } from '../lib/aspirantProfile';
import AspirantContactModal from '../pages/dashboard/components/AspirantContactModal';
import PlacementReadyBanner from '../pages/dashboard/components/PlacementReadyBanner';
import UpcomingMockBanner from '../pages/dashboard/components/UpcomingMockBanner';
import { useUpcomingScheduledMocks } from '../pages/dashboard/hooks/useUpcomingScheduledMocks';
import { emitMessagesInvalidate, MESSAGES_INVALIDATE_EVENT } from '../lib/messagesEvents';
import { fetchAspirantProfile } from '../store/slices/aspirantSlice';
import { useAspirantMessageUnread } from '../hooks/useAspirantMessageUnread';

const SIDEBAR_MAIN_LINKS = [
  { label: 'Overview', to: '/dashboard', icon: HiHome },
  { label: 'Mock Interviews', to: '/dashboard/mocks', icon: HiAcademicCap },
  { label: 'Messages', to: '/dashboard/messages', icon: HiChatBubbleLeftRight },
  { label: 'Jobs', to: '/dashboard/jobs', icon: HiBriefcase },
  { label: 'Applications', to: '/dashboard/applications', icon: HiClipboardDocumentList },
];

const SIDEBAR_BOTTOM_LINKS = [
  { label: 'My Payments', to: '/dashboard/payments', icon: HiCreditCard },
  { label: 'My Profile', to: '/dashboard/profile', icon: HiUserCircle },
];

function SidebarNavLinks({ links, location, onNavClick, scheduledMockCount = 0, messagesUnread = 0 }) {
  return (
    <div className="space-y-1">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive =
          link.to === '/dashboard'
            ? location.pathname === '/dashboard'
            : location.pathname.startsWith(link.to);
        const showMockBadge = link.to === '/dashboard/mocks' && scheduledMockCount > 0;
        const showMessagesBadge = link.to === '/dashboard/messages' && messagesUnread > 0;
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
              className={`relative flex h-8 w-8 items-center justify-center rounded-lg shrink-0 border transition-colors ${
                isActive
                  ? 'bg-white/10 text-slate-100 border-white/25'
                  : 'bg-white/[0.06] text-slate-300 border-white/15 group-hover:bg-white/12 group-hover:text-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {showMockBadge ? (
                <span
                  className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-amber-950 ring-2 ring-[#0f172a]"
                  title="Mock scheduled"
                >
                  !
                </span>
              ) : null}
              {showMessagesBadge ? (
                <span
                  className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-400 px-1 text-[10px] font-bold text-indigo-950 ring-2 ring-[#0f172a]"
                  title="Unread messages"
                >
                  {messagesUnread > 9 ? '9+' : messagesUnread}
                </span>
              ) : null}
            </span>
            <span className="truncate">{link.label}</span>
            {showMockBadge ? (
              <span className="ml-auto shrink-0 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                Scheduled
              </span>
            ) : null}
            {isActive && !showMockBadge ? (
              <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-slate-300" />
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

function SidebarContent({ user, onSignOutClick, onNavClick, showHeaderLink = true, scheduledMockCount = 0, messagesUnread = 0 }) {
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
        <SidebarNavLinks links={SIDEBAR_MAIN_LINKS} location={location} onNavClick={onNavClick} scheduledMockCount={scheduledMockCount} messagesUnread={messagesUnread} />
      </nav>
      <div className="shrink-0 border-t border-white/10 p-3 pt-2">
        <p className="px-2.5 pb-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-slate-500">
          Account
        </p>
        <SidebarNavLinks links={SIDEBAR_BOTTOM_LINKS} location={location} onNavClick={onNavClick} />
      </div>
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

function DashboardOverlays({
  showContactModal,
  user,
  aspirantProfile,
  onContactSaved,
  celebration,
  needsOnboarding,
  onCloseCelebration,
  rejection,
  onCloseRejection,
}) {
  const { openPlanModal } = usePlanModal();

  return (
    <>
      <AspirantContactModal
        open={showContactModal}
        userId={user?.id}
        email={user?.email}
        profile={aspirantProfile}
        onSaved={onContactSaved}
      />
      <PaymentRejectedModal
        open={Boolean(rejection) && !showContactModal}
        order={rejection}
        onClose={onCloseRejection}
        onTryAgain={openPlanModal}
      />
      <PlanActivatedCelebration
        open={Boolean(celebration) && !rejection}
        plan={celebration?.plan}
        needsOnboarding={needsOnboarding}
        onClose={onCloseCelebration}
      />
    </>
  );
}

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
    promptEnableNotifications: false,
  });
  const [allowingNotifications, setAllowingNotifications] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const aspirantProfile = useAppSelector((state) => state.aspirant.profile);
  const { count: scheduledMockCount } = useUpcomingScheduledMocks(user?.id);
  const { unreadTotal: messagesUnread } = useAspirantMessageUnread();
  const aspirantLoading = useAppSelector((state) => state.aspirant.loading);
  const adminProfile = useAppSelector((state) => state.admin.profile);
  const adminLoading = useAppSelector((state) => state.admin.loading);
  const [contactSaved, setContactSaved] = useState(false);
  const { celebration, closeCelebration: dismissCelebration } = usePlanActivationCelebration(user?.id);
  const { rejection, closeRejection: dismissRejection } = usePaymentRejectionNotice(user?.id);
  const needsOnboarding = !isAspirantProfileComplete(aspirantProfile);
  const isStaffAccount = Boolean(adminProfile);
  const showContactModal =
    !aspirantLoading &&
    !adminLoading &&
    !isStaffAccount &&
    !contactSaved &&
    !celebration &&
    Boolean(user?.id) &&
    needsAspirantContactDetails(aspirantProfile);

  const closeCelebration = useCallback(() => {
    dismissCelebration();
  }, [dismissCelebration]);

  const dismissNotification = useCallback(() => {
    setMessageNotification((prev) => ({ ...prev, show: false }));
  }, []);

  const handleAllowNotifications = useCallback(async () => {
    setAllowingNotifications(true);
    const result = await requestBrowserNotificationPermission();
    setAllowingNotifications(false);
    if (result.ok) {
      setMessageNotification((prev) => ({ ...prev, promptEnableNotifications: false }));
    }
  }, []);

  useEffect(() => {
    const onInvalidate = () => {
      if (user?.id) dispatch(fetchAspirantProfile(user.id));
    };
    window.addEventListener(MESSAGES_INVALIDATE_EVENT, onInvalidate);
    return () => window.removeEventListener(MESSAGES_INVALIDATE_EVENT, onInvalidate);
  }, [user?.id, dispatch]);

  useEffect(() => {
    const prime = () => primeMessageSound();
    window.addEventListener('pointerdown', prime, { once: true, passive: true });
    window.addEventListener('keydown', prime, { once: true });
    return () => {
      window.removeEventListener('pointerdown', prime);
      window.removeEventListener('keydown', prime);
    };
  }, []);

  useEffect(() => {
    return subscribeToNotificationNavigate((path) => {
      navigate(path);
    });
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      const uid = session?.user?.id ?? user?.id;
      if (!uid) return;

      unsubscribe = subscribeToAspirantMessages(
        uid,
        (row) => {
          const onMessagesPage = location.pathname === MESSAGES_PATH;
          const isBroadcast = row.to_aspirant_id == null && row.from_admin_id != null;
          const isPlanActivated = isPlanActivationMessage(row);
          const needsChromePrompt = getBrowserNotificationPermission() !== 'granted';

          const title = isPlanActivated
            ? 'Your plan is active!'
            : isBroadcast
              ? 'Naveen Talent Hub Team'
              : 'New message';
          const preview = bodyPreview(row.body);

          emitMessagesInvalidate();

          if (!onMessagesPage || needsChromePrompt) {
            setMessageNotification({
              show: true,
              title,
              bodyPreview: preview,
              link: MESSAGES_PATH,
              promptEnableNotifications: needsChromePrompt,
            });
          }

          showIncomingAspirantMessageNotification(row, MESSAGES_PATH);

          void playMessageSound();
        },
        { channelId: `dashboard-messages-${uid}` },
      );
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user?.id, location.pathname]);

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
        <SidebarContent user={user} onSignOutClick={openSignOutConfirm} onNavClick={() => {}} scheduledMockCount={scheduledMockCount} messagesUnread={messagesUnread} />
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
              scheduledMockCount={scheduledMockCount}
              messagesUnread={messagesUnread}
            />
          </aside>
        </>
      )}

      {/* Main: navbar + scrollable content */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <DashboardNavbar onMenuClick={() => setMobileSidebarOpen(true)} />
        <div className="nth-scroll-y flex-1 min-h-0 min-w-0 overflow-x-hidden p-3 sm:p-6 md:p-8">
          {location.pathname !== '/dashboard/mocks' ? (
            <>
              <UpcomingMockBanner userId={user?.id} />
              <PlacementReadyBanner profile={aspirantProfile} />
            </>
          ) : null}
          {location.pathname === '/dashboard' && user?.id && !isStaffAccount ? (
            <BrowserNotificationPrompt className="mb-4" />
          ) : null}
          <Outlet />
        </div>
      </main>

      <MessageNotification
        notification={messageNotification}
        onDismiss={dismissNotification}
        onAllowNotifications={handleAllowNotifications}
        allowingNotifications={allowingNotifications}
      />
      <DashboardOverlays
        showContactModal={showContactModal}
        user={user}
        aspirantProfile={aspirantProfile}
        onContactSaved={() => setContactSaved(true)}
        celebration={celebration}
        needsOnboarding={needsOnboarding}
        onCloseCelebration={closeCelebration}
        rejection={rejection}
        onCloseRejection={dismissRejection}
      />

      <SignOutConfirmModal
        open={signOutConfirmOpen}
        onClose={() => setSignOutConfirmOpen(false)}
        onConfirm={performSignOut}
      />
    </div>
  );
}
