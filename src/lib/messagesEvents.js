export const MESSAGES_INVALIDATE_EVENT = 'nth-messages-invalidate';

export function emitMessagesInvalidate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MESSAGES_INVALIDATE_EVENT));
  }
}
