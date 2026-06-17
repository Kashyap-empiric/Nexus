import type { QueryClient, InfiniteData } from "@tanstack/react-query";
import { queryKeys } from "@/shared/constants/queryKeys";
import type { Message } from "@/modules/messages/types/message";
import type { MessagesResponse } from "@/modules/messages/api/messages.api";
import type { Conversation, ConversationMember } from "@/modules/conversations/types/conversation";
import type { Workspace } from "@/modules/workspaces/types/workspace";

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

      // Also update workspace-level unread count (for the navigation rail badge)
      const currentUser = getAuthUser();
      if (message.userId !== currentUser?.id) {
        const channelQueries = queryClient.getQueriesData<Conversation[]>({ queryKey: ["workspace-channels"] });
        for (const [, channels] of channelQueries) {
          if (!Array.isArray(channels)) continue;
          const channel = channels.find(c => c.id === message.conversationId);
          if (channel?.workspaceId) {
            queryClient.setQueryData<Workspace[]>(["workspaces"], (oldData) => {
              if (!Array.isArray(oldData)) return oldData;
              return oldData.map((ws) => {
                if (ws.id !== channel.workspaceId) return ws;
                return {
                  ...ws,
                  unreadCount: (ws.unreadCount || 0) + 1,
                };
              });
            });
            break;
          }
        }
      }

      if (typeof document === "undefined") return;

      if (currentUser && message.userId === currentUser.id) return;

      // Suppress desktop notification if user is already viewing this conversation
      const isViewingConversation =
        typeof window !== "undefined" && (
          window.location.pathname === `/conversations/${message.conversationId}` ||
          window.location.pathname.includes(`/channels/${message.conversationId}`)
        );

      if (!isViewingConversation) {
        const originalTitle = document.title.replace(/^\(\d+\)\s/, "");
        document.title = `(1) New Message! - ${originalTitle}`;

        const onFocus = () => {
          document.title = originalTitle;
          window.removeEventListener("focus", onFocus);
        };
        window.addEventListener("focus", onFocus);

        // Show desktop notification only when tab is visible.
        // When tab is hidden, Web Push (via Service Worker) handles it.
        // Showing both would cause duplicates (C8).
        if (typeof document !== "undefined" && !document.hidden) {
          const senderName = message.user?.username || "Someone";
          const conversationName = extractConversationName(queryClient, message.conversationId);

          showMessageNotification(
            senderName,
            message.content,
            message.conversationId,
            conversationName,
          );
        }
      }
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
                  fullName: message.user?.fullName || null,
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
                fullName: message.user?.fullName || null,
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
                  fullName: message.user?.fullName || null,
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
                fullName: message.user?.fullName || null,
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

export const handlePinEvent = (queryClient: QueryClient) => {
  return (payload: { messageId: string; conversationId: string; action?: "pin" | "unpin" }) => {
    if (!payload || !payload.conversationId) return;

    // Update the pinnedMessageIds in the cached infinite query pages so the pin icon updates in real-time
    queryClient.setQueriesData<InfiniteData<MessagesResponse>>(
      { queryKey: queryKeys.messages(payload.conversationId) },
      (oldData) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => {
            const updated = new Set(page.pinnedMessageIds);
            if (payload.action === "pin") {
              updated.add(payload.messageId);
            } else if (payload.action === "unpin") {
              updated.delete(payload.messageId);
            }
            return { ...page, pinnedMessageIds: Array.from(updated) };
          }),
        };
      }
    );

    // Invalidate the PinnedMessagesPanel query so it refreshes
    queryClient.invalidateQueries({ queryKey: [...queryKeys.conversation(payload.conversationId), "pins"] });
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
  const otherMember = conversation.members?.find((m: ConversationMember) => m.userId !== currentUser?.id);
  return otherMember?.user?.username || null;
}
