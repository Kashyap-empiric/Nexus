import type { QueryClient, InfiniteData } from "@tanstack/react-query";
import { queryKeys } from "@/shared/constants/queryKeys";
import type { Message } from "@/modules/messages/types/message";
import type { MessagesResponse } from "@/modules/messages/api/messages.api";
import type { Conversation, ConversationMember } from "@/modules/conversations/types/conversation";
import type { Workspace } from "@/modules/workspaces/types/workspace";

import { getAuthUser } from "@/modules/auth/store/useAuthStore";
import { showMessageNotification } from "@/shared/lib/notifications";
import { useThreadStore } from "@/modules/threads/store/threadStore";

export const handleMessageNew = (queryClient: QueryClient) => {
  return (message: Message) => {
    try {
      if (!message || !message.id) throw new Error("Invalid payload");

      const store = useThreadStore.getState();

      if (message.threadRootId) {
        const { activeThreadRootId, appendReply } = store;

        if (activeThreadRootId === message.threadRootId) {
          appendReply(message);
        }

        queryClient.setQueryData<InfiniteData<MessagesResponse>>(
          queryKeys.messages(message.conversationId),
          (oldData) => {
            if (!oldData?.pages) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map((page) => ({
                ...page,
                data: page.data.map((m) =>
                  m.id === message.threadRootId
                    ? {
                        ...m,
                        threadReplyCount: (m.threadReplyCount ?? 0) + 1,
                        lastThreadReplyAt: message.createdAt,
                      }
                    : m
                ),
              })),
            };
          }
        );

        const currentUser = getAuthUser();
        const isOwn = message.userId === currentUser?.id;
        if (!isOwn && activeThreadRootId !== message.threadRootId) {
          const titleMessage = `New reply in thread`;
          const senderName = message.user?.username || "Someone";
          if (typeof document !== "undefined" && !document.hasFocus()) {
            showMessageNotification(
              senderName,
              message.content,
              message.conversationId,
              titleMessage,
            );
          }
        }

        return;
      }

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

      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
      const isViewingConversation =
        typeof window !== "undefined" &&
        currentPath.includes(message.conversationId) &&
        document.hasFocus();

      if (!isViewingConversation) {
        const originalTitle = document.title.replace(/^\(\d+\) New Message! - /, "");
        document.title = `(1) New Message! - ${originalTitle}`;

        const onFocus = () => {
          document.title = originalTitle;
          window.removeEventListener("focus", onFocus);
        };
        window.addEventListener("focus", onFocus);

        if (typeof document !== "undefined" && !document.hasFocus()) {
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
      console.warn("[Socket] Failed to parse incoming message:new", err);
    }
  };
};

export const handleMessageUpdate = (queryClient: QueryClient) => {
  return (message: Message) => {
    try {
      if (!message || !message.id) return;

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
      console.warn("[Socket] Failed to parse incoming message:update", err);
    }
  };
};

export const handleMessageDelete = (queryClient: QueryClient) => {
  return (message: Message) => {
    try {
      if (!message || !message.id) return;

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
      console.warn("[Socket] Failed to parse incoming message:delete", err);
    }
  };
};

export const handlePinEvent = (queryClient: QueryClient) => {
  return (payload: { messageId: string; conversationId: string; action?: "pin" | "unpin" }) => {
    if (!payload || !payload.conversationId) return;

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

  if (conversation.type === "CHANNEL") {
    return `# ${conversation.name || "channel"}`;
  }

  const currentUser = getAuthUser();
  const otherMember = conversation.members?.find((m: ConversationMember) => m.userId !== currentUser?.id);
  return otherMember?.user?.username || null;
}
