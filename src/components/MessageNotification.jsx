import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiChatBubbleLeftRight, HiXMark } from 'react-icons/hi2';

const AUTO_DISMISS_MS = 6000;

/**
 * Full notification card for new messages (not a tiny toast).
 * Shows title, body preview, View button; auto-dismisses after AUTO_DISMISS_MS.
 */
export default function MessageNotification({ notification, onDismiss }) {
  const { show, title, bodyPreview, link } = notification;

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [show, onDismiss]);

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
          {bodyPreview && (
            <p className="text-sm text-[rgb(var(--nth-text-muted-light))] mt-0.5 line-clamp-2">
              {bodyPreview}
            </p>
          )}
          <Link
            to={link || '/dashboard/messages'}
            onClick={onDismiss}
            className="inline-block mt-2 text-sm font-medium text-[hsl(var(--nth-primary))] hover:underline"
          >
            View messages →
          </Link>
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
