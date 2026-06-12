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

      // Also update workspace channels if applicable
      const queries = queryClient.getQueriesData<Conversation[]>({ queryKey: ["workspace-channels"] });
      queries.forEach(([queryKey, oldData]) => {
        if (!Array.isArray(oldData)) return;
        queryClient.setQueryData(queryKey, oldData.map((conv) => {
          if (conv.id !== message.conversationId) return conv;
          const currentUser = getAuthUser();
          return {
            ...conv,
            unreadCount: (conv.unreadCount || 0) + (message.userId !== currentUser?.id ? 1 : 0),
          };
        }));
      });

      if (typeof document === "undefined" || !document.hidden) return;

      const currentUser = getAuthUser();
      if (currentUser && message.userId === currentUser.id) return;

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

export const handleMessageUpdate = (queryClient: QueryClient) => {
  return (message: Message) => {
    try {
      if (!message || !message.id) return;

      // Update conversations list sidebar cache
      queryClient.setQueryData<Conversation[]>(
        queryKeys.conversations,
        (oldData) => {
          if (!Array.isArray(oldData)) return oldData;

          return oldData.map((conv) => {
            if (conv.latestMessageId !== message.id) return conv;
            return {
              ...conv,
              latestMessage: {
                id: message.id,
                userId: message.userId,
                content: message.content,
                deletedAt: null,
                createdAt: message.createdAt,
                user: {
                  username: message.user?.username || "Unknown",
                },
              },
            };
          });
        }
      );

      // Update workspace channels cache
      const queries = queryClient.getQueriesData<Conversation[]>({ queryKey: ["workspace-channels"] });
      queries.forEach(([queryKey, oldData]) => {
        if (!Array.isArray(oldData)) return;
        queryClient.setQueryData(queryKey, oldData.map((conv) => {
          if (conv.latestMessageId !== message.id) return conv;
          return {
            ...conv,
            latestMessage: {
              id: message.id,
              userId: message.userId,
              content: message.content,
              deletedAt: null,
              createdAt: message.createdAt,
              user: {
                username: message.user?.username || "Unknown",
              },
            },
          };
        }));
      });
    } catch (err) {
      console.error("Failed to parse incoming message:update", err);
    }
  };
};

export const handleMessageDelete = (queryClient: QueryClient) => {
  return (message: Message) => {
    try {
      if (!message || !message.id) return;

      // Update conversations list sidebar cache
      queryClient.setQueryData<Conversation[]>(
        queryKeys.conversations,
        (oldData) => {
          if (!Array.isArray(oldData)) return oldData;

          return oldData.map((conv) => {
            if (conv.latestMessageId !== message.id) return conv;
            return {
              ...conv,
              latestMessage: {
                id: message.id,
                userId: message.userId,
                content: message.content,
                deletedAt: message.deletedAt || null,
                createdAt: message.createdAt,
                user: {
                  username: message.user?.username || "Unknown",
                },
              },
            };
          });
        }
      );

      // Update workspace channels cache
      const queries = queryClient.getQueriesData<Conversation[]>({ queryKey: ["workspace-channels"] });
      queries.forEach(([queryKey, oldData]) => {
        if (!Array.isArray(oldData)) return;
        queryClient.setQueryData(queryKey, oldData.map((conv) => {
          if (conv.latestMessageId !== message.id) return conv;
          return {
            ...conv,
            latestMessage: {
              id: message.id,
              userId: message.userId,
              content: message.content,
              deletedAt: message.deletedAt || null,
              createdAt: message.createdAt,
              user: {
                username: message.user?.username || "Unknown",
              },
            },
          };
        }));
      });
    } catch (err) {
      console.error("Failed to parse incoming message:delete", err);
    }
  };
};

function extractConversationName(queryClient: QueryClient, conversationId: string): string | null {
  const conversations = queryClient.getQueryData<Conversation[]>(queryKeys.conversations);
  let conversation = Array.isArray(conversations) ? conversations.find((c) => c.id === conversationId) : undefined;
  
  if (!conversation) {
    const queries = queryClient.getQueriesData<Conversation[]>({ queryKey: ["workspace-channels"] });
    for (const [, oldData] of queries) {
      if (Array.isArray(oldData)) {
        const found = oldData.find((c) => c.id === conversationId);
        if (found) {
          conversation = found;
          break;
        }
      }
    }
  }

  if (!conversation) return null;

  // Return channel name for channels, or null for DMs (sender name is enough)
  if (conversation.type === "CHANNEL") {
    return `# ${conversation.name || "channel"}`;
  }

  // For DMs, return the other person's name as context
  const currentUser = getAuthUser();
  const otherMember = conversation.members?.find((m: any) => m.userId !== currentUser?.id);
  return otherMember?.user?.username || null;
}
