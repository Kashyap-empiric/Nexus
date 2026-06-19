import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/constants/queryKeys";
import type { Notification } from "@/modules/notifications/types/notification";
import { showNotification } from "@/shared/lib/notifications";

/**
 * Notification types that should NOT trigger a desktop notification
 * because the message:new handler already shows one for the same event.
 */
const SUPPRESS_DESKTOP_TYPES = new Set(["MESSAGE_REPLIED"]);

export const handleNotificationNew = (queryClient: QueryClient) => {
  return (notification: Notification) => {
    try {
      if (!notification || !notification.id) return;

      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });

      queryClient.setQueryData<number>(
        queryKeys.unreadCount,
        (oldCount) => (oldCount ?? 0) + 1
      );

      // Skip desktop notification for types that are already covered
      // by the message:new handler (e.g. MESSAGE_REPLIED) to avoid duplicates.
      if (SUPPRESS_DESKTOP_TYPES.has(notification.type)) return;

      if (
        typeof document !== "undefined" &&
        document.hasFocus() &&
        typeof window !== "undefined"
      ) {
        const isViewingRelevantPage =
          notification.link &&
          window.location.pathname === notification.link;

        if (!isViewingRelevantPage) {
          showNotification({
            title: notification.title,
            body: notification.body || "",
            tag: notification.id,
            onClickUrl: notification.link || undefined,
          });
        }
      }
    } catch (err) {
      console.error("Failed to handle incoming notification", err);
    }
  };
};
