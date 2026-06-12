import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/constants/queryKeys";
import type { Notification } from "@/modules/notifications/types/notification";
import { showNotification } from "@/shared/lib/notifications";

export const handleNotificationNew = (queryClient: QueryClient) => {
  return (notification: Notification) => {
    try {
      if (!notification || !notification.id) return;

      // Append to the inbox cache
      queryClient.setQueryData<{ pages: { data: Notification[]; nextCursor: string | null }[] }>(
        queryKeys.notifications,
        (oldData) => {
          if (!oldData?.pages) return oldData;

          const updatedPages = oldData.pages.map((page, index) => {
            if (index === 0) {
              return {
                ...page,
                data: [notification, ...page.data],
              };
            }
            return page;
          });

          return { ...oldData, pages: updatedPages };
        }
      );

      // Increment unread count
      queryClient.setQueryData<number>(
        queryKeys.unreadCount,
        (oldCount) => (oldCount ?? 0) + 1
      );

      // Show desktop notification if tab is hidden
      if (typeof document !== "undefined" && document.hidden) {
        showNotification({
          title: notification.title,
          body: notification.body || "",
          tag: notification.id,
          onClickUrl: notification.link || undefined,
        });
      }
    } catch (err) {
      console.error("Failed to handle incoming notification", err);
    }
  };
};
