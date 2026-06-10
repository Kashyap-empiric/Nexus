import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/constants/queryKeys";
import type { Message } from "../types/message";
import type { Conversation } from "../types/conversation";

import { getAuthUser } from "@/modules/auth/store/useAuthStore";

export const handleMessageNew = (queryClient: QueryClient) => {
  return (message: Message) => {
    try {
      if (!message || !message.id) throw new Error("Invalid payload");

      queryClient.setQueryData<Conversation[]>(
        queryKeys.conversations,
        (oldData) => {
          if (!Array.isArray(oldData)) return oldData;

          return oldData.map((conv) => {
            if (conv.id !== message.conversationId) return conv;
            const currentUser = getAuthUser();

            return {
              ...conv,
              unreadCount: (conv.unreadCount || 0) + (message.userId !== currentUser?.id ? 1 : 0),
            };
          });
        }
      );

      // Dynamic Browser Tab Unread Badge
      if (typeof document !== "undefined" && document.hidden) {
        const originalTitle = document.title.replace(/^\(\d+\)\s/, "");
        document.title = `(1) New Message! - ${originalTitle}`;

        const onFocus = () => {
          document.title = originalTitle;
          window.removeEventListener("focus", onFocus);
        };
        window.addEventListener("focus", onFocus);
      }
    } catch (err) {
      console.error("Failed to parse incoming message", err);
    }
  };
};
