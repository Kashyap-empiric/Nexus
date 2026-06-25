"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SOCKET_EVENTS } from "@/socket/socket-events";
import { useSocketEvents } from "@/socket/useSocketEvent";
import { useSocketStore } from "@/socket/socketStore";
import { queryKeys } from "@/shared/constants/queryKeys";
import type { Message, MessagePage } from "@/modules/messages/types/message";
import type { Conversation } from "@/modules/conversations/types/conversation";
import type { MessageReadPayload } from "../types/socket";
import type { ThreadData } from "@/modules/threads/store/threadStore";
import { InfiniteData } from "@tanstack/react-query";
import { getAuthUser } from "@/modules/auth/store/useAuthStore";

export const useConversationSocket = (conversationId: string) => {
  const queryClient = useQueryClient();

  const events = useMemo(() => {
    if (!conversationId) return {} as Record<string, (payload: never) => void>;

    const addTypingUser = useSocketStore.getState().addTypingUser;
    const removeTypingUser = useSocketStore.getState().removeTypingUser;

    const onTypingStart = (payload: { conversationId: string; userId: string; username: string }) => {
      if (payload.conversationId !== conversationId) return;
      addTypingUser(payload.conversationId, payload.userId, payload.username);
    };

    const onTypingStop = (payload: { conversationId: string; userId: string }) => {
      if (payload.conversationId !== conversationId) return;
      removeTypingUser(payload.conversationId, payload.userId);
    };

    const onMessageNew = (message: Message) => {
      try {
        if (!message || !message.id) throw new Error("Invalid payload");
        if (message.conversationId !== conversationId) return;

        const currentUser = getAuthUser();
        if (currentUser && message.userId === currentUser.id) return;

        if (message.threadRootId) {
          queryClient.setQueryData(
            [...queryKeys.messages(conversationId), "thread", message.threadRootId],
            (old: ThreadData | undefined) => {
              if (!old || !old.replies) return old;
              const exists = old.replies.some((m: Message) => m.id === message.id);
              if (exists) return old;
              return {
                ...old,
                replies: [...old.replies, message],
              };
            }
          );
          queryClient.setQueryData<InfiniteData<MessagePage>>(queryKeys.messages(conversationId), (old) => {
            if (!old || !old.pages) return old;
            return {
              ...old,
              pages: old.pages.map(page => ({
                ...page,
                data: page.data.map(m => m.id === message.threadRootId ? {
                  ...m,
                  threadReplyCount: (m.threadReplyCount || 0) + 1,
                  lastThreadReplyAt: message.createdAt
                } : m)
              }))
            };
          });
        }
        
        if (!message.threadRootId || message.isThreadBroadcast) {
          queryClient.setQueryData<InfiniteData<MessagePage>>(
            queryKeys.messages(conversationId),
            (oldData) => {
              if (!oldData || !oldData.pages) return oldData;

              const updatedPages = oldData.pages.map((page, index) => {
                if (index === 0) {
                  const exists = page.data.some((m) => m.id === message.id);
                  if (exists) {
                    return {
                      ...page,
                      data: page.data.map((m) => (m.id === message.id ? message : m)),
                    };
                  }
                  return {
                    ...page,
                    data: [message, ...page.data],
                  };
                }
                return page;
              });

              return {
                ...oldData,
                pages: updatedPages,
              };
            }
          );
        }
      } catch (err) {
        console.warn("[Socket] Failed to parse incoming message:new", err);
      }
    };

    const onMessageRead = (payload: MessageReadPayload) => {
      try {
        const { conversationId: readConvId, userId, lastReadMessageId } = payload;
        if (readConvId !== conversationId) return;

        queryClient.setQueryData<Conversation[]>(queryKeys.conversations, (oldData) => {
          if (!Array.isArray(oldData)) return oldData;
          return oldData.map((conv) => {
            if (conv.id !== conversationId) return conv;
            return {
              ...conv,
              members: conv.members.map((member) => {
                if (member.userId === userId) {
                  return { ...member, lastReadMessageId };
                }
                return member;
              }),
            };
          });
        });

        queryClient.setQueryData<Conversation>(queryKeys.conversation(conversationId), (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            members: oldData.members.map((member) => {
              if (member.userId === userId) {
                return { ...member, lastReadMessageId };
              }
              return member;
            }),
          };
        });
      } catch (err) {
        console.warn("[Socket] Failed to parse incoming message:read", err);
      }
    };

    const onMessageUpdate = (message: Message) => {
      try {
        if (!message || !message.id || message.conversationId !== conversationId) return;

        if (message.threadRootId) {
          queryClient.setQueryData(
            [...queryKeys.messages(conversationId), "thread", message.threadRootId],
            (old: ThreadData | undefined) => {
              if (!old || !old.replies) return old;
              return {
                ...old,
                replies: old.replies.map((m: Message) => (m.id === message.id ? { ...m, ...message } : m)),
              };
            }
          );
        }
        
        if (!message.threadRootId || message.isThreadBroadcast) {
          queryClient.setQueryData<InfiniteData<MessagePage>>(
            queryKeys.messages(conversationId),
            (oldData) => {
              if (!oldData || !oldData.pages) return oldData;

              const updatedPages = oldData.pages.map((page) => ({
                ...page,
                data: page.data.map((m) => (m.id === message.id ? { ...m, ...message } : m)),
              }));

              return {
                ...oldData,
                pages: updatedPages,
              };
            }
          );
        }
      } catch (err) {
        console.warn("[Socket] Failed to parse incoming message:update", err);
      }
    };

    const onMessageDelete = (message: Message) => {
      try {
        if (!message || !message.id || message.conversationId !== conversationId) return;

        if (message.threadRootId) {
          queryClient.setQueryData(
            [...queryKeys.messages(conversationId), "thread", message.threadRootId],
            (old: ThreadData | undefined) => {
              if (!old || !old.replies) return old;
              return {
                ...old,
                replies: old.replies.map((m: Message) => (m.id === message.id ? message : m)),
              };
            }
          );
          queryClient.setQueryData<InfiniteData<MessagePage>>(
            queryKeys.messages(conversationId),
            (old) => {
              if (!old || !old.pages) return old;
              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  data: page.data.map((m) =>
                    m.id === message.threadRootId
                      ? { ...m, threadReplyCount: Math.max(0, (m.threadReplyCount || 0) - 1) }
                      : m
                  ),
                })),
              };
            }
          );
        }
        
        if (!message.threadRootId || message.isThreadBroadcast) {
          queryClient.setQueryData<InfiniteData<MessagePage>>(
            queryKeys.messages(conversationId),
            (oldData) => {
              if (!oldData || !oldData.pages) return oldData;

              const updatedPages = oldData.pages.map((page) => ({
                ...page,
                data: page.data.map((m) => (m.id === message.id ? message : m)),
              }));

              return {
                ...oldData,
                pages: updatedPages,
              };
            }
          );
          // Update thread root if it was a thread
          queryClient.setQueryData(
            [...queryKeys.messages(conversationId), "thread", message.id],
            (old: ThreadData | undefined) => {
              if (!old || !old.root) return old;
              return {
                ...old,
                root: message,
                replies: old.replies.map((r: Message) => ({ ...r, deletedAt: message.deletedAt })),
              };
            }
          );
        }
      } catch (err) {
        console.warn("[Socket] Failed to parse incoming message:delete", err);
      }
    };

    return {
      [SOCKET_EVENTS.TYPING_START]: onTypingStart,
      [SOCKET_EVENTS.TYPING_STOP]: onTypingStop,
      [SOCKET_EVENTS.MESSAGE_NEW]: onMessageNew,
      [SOCKET_EVENTS.MESSAGE_READ]: onMessageRead,
      [SOCKET_EVENTS.MESSAGE_UPDATE]: onMessageUpdate,
      [SOCKET_EVENTS.MESSAGE_DELETE]: onMessageDelete,
    };
  }, [conversationId, queryClient]);

  useSocketEvents(events);
};
