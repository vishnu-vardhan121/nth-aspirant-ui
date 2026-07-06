const NOTIFICATION_CLICK_EVENT = 'nth-notification-navigate';

function previewBody(body, maxLen = 120) {
  if (!body) return '';
  const t = String(body).replace(/\n/g, ' ').trim();
  return t.length <= maxLen ? t : `${t.slice(0, maxLen)}…`;
}

export function incomingMessageNotificationContent(row) {
  const isBroadcast = row?.to_aspirant_id == null && row?.from_admin_id != null;
  const fromInterviewer = row?.to_aspirant_id != null && row?.from_interviewer_id != null;
  const title = fromInterviewer
    ? 'Mock interviewer'
    : isBroadcast
      ? 'Naveen Talent Hub Team'
      : 'New message';
  return {
    title,
    body: previewBody(row?.body),
    tag: row?.id ? `msg-${row.id}` : `nth-${Date.now()}`,
  };
}

export function isBrowserNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getBrowserNotificationPermission() {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export function areBrowserNotificationsActive() {
  return getBrowserNotificationPermission() === 'granted';
}

export function shouldPromptForBrowserNotifications() {
  if (!isBrowserNotificationSupported()) return false;
  return getBrowserNotificationPermission() !== 'granted';
}

/** Call from a button click — browsers require a user gesture for permission. */
export async function requestBrowserNotificationPermission() {
  if (!isBrowserNotificationSupported()) {
    return { ok: false, error: 'Notifications are not supported in this browser.' };
  }
  if (Notification.permission === 'granted') {
    return { ok: true, permission: 'granted' };
  }
  if (Notification.permission === 'denied') {
    return {
      ok: false,
      error: 'Notifications are blocked. Open your browser site settings and allow notifications for this site.',
      permission: 'denied',
    };
  }
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    return { ok: true, permission };
  }
  return { ok: false, error: 'Notification permission was not granted.', permission };
}

export function subscribeToNotificationNavigate(handler) {
  if (typeof window === 'undefined') return () => {};
  const listener = (event) => {
    const path = event?.detail?.path;
    if (path) handler(path);
  };
  window.addEventListener(NOTIFICATION_CLICK_EVENT, listener);
  return () => window.removeEventListener(NOTIFICATION_CLICK_EVENT, listener);
}

export function showBrowserMessageNotification({ title, body, path = '/dashboard/messages', tag }) {
  if (!areBrowserNotificationsActive()) return false;

  try {
    const notification = new Notification(title, {
      body: body || '',
      icon: '/dark-logo.png',
      badge: '/dark-logo.png',
      tag: tag || 'nth-aspirant-message',
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      window.dispatchEvent(
        new CustomEvent(NOTIFICATION_CLICK_EVENT, { detail: { path } }),
      );
    };
    return true;
  } catch {
    return false;
  }
}

/** Chrome popup for a realtime message row (when permission granted). */
export function showIncomingAspirantMessageNotification(row, path = '/dashboard/messages') {
  if (!areBrowserNotificationsActive()) return false;
  const { title, body, tag } = incomingMessageNotificationContent(row);
  return showBrowserMessageNotification({ title, body, path, tag });
}
