import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/constants/queryKeys";
import type { Message } from "@/modules/messages/types/message";
import type { Conversation } from "@/modules/conversations/types/conversation";

import { getAuthUser } from "@/modules/auth/store/useAuthStore";
import { showMessageNotification } from "@/shared/lib/notifications";

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

      // Only notify if the tab is hidden (user is not actively viewing)
      if (typeof document === "undefined" || !document.hidden) return;

      // Don't notify about our own messages from other devices/tabs
      const currentUser = getAuthUser();
      if (currentUser && message.userId === currentUser.id) return;

      // Dynamic Browser Tab Unread Badge
      const originalTitle = document.title.replace(/^\(\d+\)\s/, "");
      document.title = `(1) New Message! - ${originalTitle}`;

      const onFocus = () => {
        document.title = originalTitle;
        window.removeEventListener("focus", onFocus);
      };
      window.addEventListener("focus", onFocus);

      // Show desktop notification
      const senderName = message.user?.username || "Someone";
      const conversationName = extractConversationName(queryClient, message.conversationId);

      showMessageNotification(
        senderName,
        message.content,
        message.conversationId,
        conversationName,
      );
    } catch (err) {
      console.error("Failed to parse incoming message", err);
    }
  };
};

/**
 * Look up the conversation name from the cached conversations list.
 * Returns null if the data isn't available yet, so the notification
 * falls back to showing just the sender name.
 */
function extractConversationName(queryClient: QueryClient, conversationId: string): string | null {
  const conversations = queryClient.getQueryData<Conversation[]>(queryKeys.conversations);
  if (!Array.isArray(conversations)) return null;

  const conversation = conversations.find((c) => c.id === conversationId);
  if (!conversation) return null;

  // Return channel name for channels, or null for DMs (sender name is enough)
  if (conversation.type === "CHANNEL") {
    return `# ${conversation.name || "channel"}`;
  }

  // For DMs, return the other person's name as context
  const currentUser = getAuthUser();
  const otherMember = conversation.members?.find((m) => m.userId !== currentUser?.id);
  return otherMember?.user?.username || null;
}
