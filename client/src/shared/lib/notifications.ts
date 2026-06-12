/**
 * Browser Notification API utilities for desktop push notifications.
 * Falls back gracefully if the API is unavailable or permission is denied.
 */

const isSupported = (): boolean => {
  return typeof window !== "undefined" && "Notification" in window;
};

/**
 * Request permission to show desktop notifications.
 * - "default" → the user hasn't been asked yet; the browser prompt shows
 * - "granted" → already allowed; resolves immediately
 * - "denied" → previously blocked; resolves immediately (can't re-prompt)
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | null> {
  if (!isSupported()) return null;

  // If already granted or denied, return the current state without prompting
  if (Notification.permission !== "default") {
    return Notification.permission;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    // Old browsers that don't support the promise-based API
    return null;
  }
}

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  /** URL to navigate to when the notification is clicked */
  onClickUrl?: string;
  /** The conversation ID to navigate to on click */
  conversationId?: string;
}

/**
 * Show a desktop notification.
 * Silently returns false if the API is unavailable or permission is denied.
 * Returns true if notification was shown successfully.
 */
export function showNotification(options: NotificationOptions): boolean {
  if (!isSupported()) return false;
  if (Notification.permission !== "granted") return false;

  const notification = new Notification(options.title, {
    body: options.body,
    icon: options.icon || undefined,
    tag: options.tag || options.conversationId, // Deduplicate by tag
    silent: false,
  });

  // Navigate to conversation when notification is clicked
  if (options.onClickUrl) {
    notification.onclick = () => {
      window.focus();
      if (options.onClickUrl) {
        window.location.href = options.onClickUrl;
      }
      notification.close();
    };
  }

  // Auto-close after 8 seconds
  setTimeout(() => notification.close(), 8000);

  return true;
}

/**
 * Show a notification for an incoming message.
 *
 * @param senderName  The sender's display name
 * @param content     The message content (truncated)
 * @param conversationId  The conversation to navigate to on click
 * @param conversationName  Optional conversation/channel name
 */
export function showMessageNotification(
  senderName: string,
  content: string,
  conversationId: string,
  conversationName?: string | null,
): boolean {
  const baseUrl = window.location.origin;
  const conversationUrl = `${baseUrl}/conversations/${conversationId}`;

  // Truncate long messages for the notification body
  const maxLength = 120;
  const truncatedContent = content.length > maxLength
    ? content.substring(0, maxLength) + "…"
    : content;

  const title = senderName;
  const body = conversationName
    ? `${conversationName}: ${truncatedContent}`
    : truncatedContent;

  return showNotification({
    title,
    body,
    tag: conversationId,
    conversationId,
    onClickUrl: conversationUrl,
  });
}

/**
 * Returns the current notification permission status.
 */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isSupported()) return "unsupported";
  return Notification.permission;
}
