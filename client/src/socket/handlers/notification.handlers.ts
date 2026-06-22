import type { QueryClient, InfiniteData } from "@tanstack/react-query";
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
      console.warn("[Socket] Failed to handle incoming notification", err);
    }
  };
};

export const handleNotificationUpdate = (queryClient: QueryClient) => {
  return (notification: Notification) => {
    try {
      if (!notification || !notification.id) return;

      queryClient.setQueriesData<InfiniteData<{ data: Notification[]; nextCursor: string | null }>>(
        { queryKey: queryKeys.notifications },
        (oldData) => {
          if (!oldData?.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              data: page.data.map((n) =>
                n.id === notification.id ? { ...n, ...notification } : n
              ),
            })),
          };
        }
      );
    } catch (err) {
      console.warn("[Socket] Failed to handle notification:update", err);
    }
  };
};
