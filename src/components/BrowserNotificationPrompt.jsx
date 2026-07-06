import { useState } from 'react';
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  shouldPromptForBrowserNotifications,
} from '../lib/browserNotifications';

/** Shown when Chrome notification permission is not granted yet. */
export default function BrowserNotificationPrompt({ className = '' }) {
  const [hint, setHint] = useState('');
  const [, bump] = useState(0);

  if (!shouldPromptForBrowserNotifications()) return null;

  const permission = getBrowserNotificationPermission();

  const handleAllow = async () => {
    setHint('');
    const result = await requestBrowserNotificationPermission();
    if (result.ok) {
      bump((n) => n + 1);
    } else {
      setHint(result.error || 'Could not enable notifications.');
    }
  };

  return (
    <div
      className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 ${className}`.trim()}
      role="region"
      aria-label="Enable browser notifications"
    >
      <p className="font-semibold">Please allow browser notifications</p>
      <p className="mt-1 text-amber-900/90 leading-snug">
        So you don&apos;t miss team replies when this tab is in the background. Unread messages still show
        in Messages if you skip this.
      </p>
      {permission === 'denied' ? (
        <p className="mt-2 text-xs text-amber-900/80">
          Notifications are blocked in your browser. Open site settings for this page and allow notifications.
        </p>
      ) : (
        <button
          type="button"
          onClick={handleAllow}
          className="mt-3 rounded-lg bg-[hsl(var(--nth-primary))] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Allow notifications
        </button>
      )}
      {hint ? <p className="mt-2 text-xs text-red-700">{hint}</p> : null}
    </div>
  );
}
