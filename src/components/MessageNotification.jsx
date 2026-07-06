import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiChatBubbleLeftRight, HiXMark } from 'react-icons/hi2';

const AUTO_DISMISS_MS = 8000;

/**
 * In-app alert for new messages. Can include Allow for Chrome notifications.
 */
export default function MessageNotification({
  notification,
  onDismiss,
  onAllowNotifications,
  allowingNotifications = false,
}) {
  const { show, title, bodyPreview, link, promptEnableNotifications } = notification;

  useEffect(() => {
    if (!show || promptEnableNotifications) return;
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [show, promptEnableNotifications, onDismiss]);

  if (!show) return null;

  return (
    <div
      role="alert"
      className="fixed top-4 inset-x-4 z-[200] mx-auto max-w-sm rounded-xl border border-[rgb(var(--nth-border-light))] bg-white shadow-lg shadow-slate-200/80 overflow-hidden"
      style={{ animation: 'messageNotificationIn 0.25s ease-out' }}
    >
      <div className="flex gap-3 p-4">
        <span className="w-10 h-10 rounded-full bg-[hsl(var(--nth-primary))]/15 flex items-center justify-center shrink-0">
          <HiChatBubbleLeftRight className="w-5 h-5 text-[hsl(var(--nth-primary))]" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[rgb(var(--nth-text-primary-light))]">{title}</p>
          {bodyPreview ? (
            <p className="text-sm text-[rgb(var(--nth-text-muted-light))] mt-0.5 line-clamp-2">
              {bodyPreview}
            </p>
          ) : null}
          {promptEnableNotifications ? (
            <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2 leading-snug">
              Allow Chrome notifications so you don&apos;t miss replies when this tab is in the background.
              Unread counts still show in Messages if you skip this.
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {promptEnableNotifications && onAllowNotifications ? (
              <button
                type="button"
                onClick={onAllowNotifications}
                disabled={allowingNotifications}
                className="text-sm font-semibold text-white bg-[hsl(var(--nth-primary))] hover:opacity-90 disabled:opacity-60 rounded-lg px-3 py-1.5"
              >
                {allowingNotifications ? 'Asking…' : 'Allow notifications'}
              </button>
            ) : null}
            <Link
              to={link || '/dashboard/messages'}
              onClick={onDismiss}
              className="text-sm font-medium text-[hsl(var(--nth-primary))] hover:underline"
            >
              View messages →
            </Link>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <HiXMark className="w-5 h-5" />
        </button>
      </div>
      <style>{`
        @keyframes messageNotificationIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
