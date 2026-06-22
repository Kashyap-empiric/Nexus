/**
 * Browser Notification API utilities for desktop push notifications.
 * Falls back gracefully if the API is unavailable or permission is denied.
 */

const isSupported = (): boolean => {
  return typeof window !== "undefined" && "Notification" in window;
};

export async function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("/sw.js");
    } catch (err) {
      console.error("Service Worker registration failed:", err);
    }
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission | null> {
  if (!isSupported()) return null;

  await registerServiceWorker();

  if (Notification.permission !== "default") {
    return Notification.permission;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return null;
  }
}

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  onClickUrl?: string;
  conversationId?: string;
}

export function showNotification(options: NotificationOptions): boolean {
  if (!isSupported()) return false;
  if (Notification.permission !== "granted") return false;

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || "/images/Logo.png",
      badge: options.badge || "/images/Logo.png",
      tag: options.tag || options.conversationId, 
      silent: false,
    });

    if (options.onClickUrl) {
      notification.onclick = () => {
        window.focus();
        if (options.onClickUrl) {
          window.location.href = options.onClickUrl;
        }
        notification.close();
      };
    }

    setTimeout(() => notification.close(), 8000);

    return true;
  } catch (error: unknown) {
    const err = error && typeof error === "object" ? error as { name?: string } : {};
    if (err.name === 'TypeError' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(options.title, {
          body: options.body,
          icon: options.icon || "/images/Logo.png",
          badge: options.badge || "/images/Logo.png",
          tag: options.tag || options.conversationId,
          data: { url: options.onClickUrl }
        }).catch(err => console.error("ServiceWorker showNotification failed:", err));
      }).catch(err => console.error("ServiceWorker ready failed:", err));
      return true;
    }
    console.error("Failed to show desktop notification:", error);
    return false;
  }
}

export function showMessageNotification(
  senderName: string,
  content: string,
  conversationId: string,
  conversationName?: string | null,
): boolean {
  const baseUrl = window.location.origin;
  const conversationUrl = `${baseUrl}/conversations/${conversationId}`;

  const maxLength = 120;
  const truncatedContent = content.length > maxLength
    ? content.substring(0, maxLength) + "…"
    : content;

  const body = conversationName?.startsWith("#")
    ? `${conversationName}\n\n${senderName}: ${truncatedContent}`
    : `${senderName}: ${truncatedContent}`;

  return showNotification({
    title: "Nexus",
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
