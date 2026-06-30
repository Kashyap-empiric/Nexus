import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as messagesApi from "../api/messages.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import { socket } from "@/socket/socketClient";
import { SOCKET_EVENTS } from "@/socket/socket-events";
import type { User, Conversation } from "@/modules/conversations/types/conversation";
import type { Message, MessagePage } from "../types/message";
import type { ThreadData } from "@/modules/threads/store/threadStore";
import type { SocketResponse, MessageSendPayload } from "@/modules/chat/types/socket";
import type { InfiniteData } from "@tanstack/react-query";
import React from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/shared/lib/friendly-error";

const COMMON_ERROR_MAP: Record<string, string> = {
  unauthorized: "You don't have permission to do that.",
  forbidden: "You don't have permission to do that.",
  not_found: "That message wasn't found. It may have been deleted.",
  "too quickly": "You're sending messages too quickly. Please slow down.",
};


export const useMessagesInfiniteQuery = (conversationId: string) => {
  return useInfiniteQuery({
    queryKey: queryKeys.messages(conversationId),
    queryFn: ({ pageParam }) => messagesApi.getMessages(conversationId, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
    enabled: !!conversationId,
    // Safely beat the 1-hour expiry of signed URLs
    staleTime: 55 * 60 * 1000, 
    gcTime: 65 * 60 * 1000, 
  });
};

export const useSendMessageMutation = (conversationId: string, currentUser?: User | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, tempId, replyToId, threadRootId, isThreadBroadcast, attachmentIds }: MessageSendPayload) => {
      return new Promise<Message>((resolve, reject) => {
        socket.emit(SOCKET_EVENTS.MESSAGE_SEND, { conversationId, content, tempId, replyToId, threadRootId, isThreadBroadcast, attachmentIds }, (response: SocketResponse<Message>) => {
          if (response?.error) {
            const errorMsg = typeof response.error === 'string'
              ? response.error
              : response.error.message || "Failed to send message";
            reject(new Error(errorMsg));
          } else if (response?.success && response?.data) {
            resolve(response.data);
          } else {
            reject(new Error("Unknown error"));
          }
        });
      });
    },
    onMutate: async ({ content, tempId, threadRootId, isThreadBroadcast, optimisticAttachments }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.messages(conversationId) });

      const userId = currentUser?.id || "me";
      const username = currentUser?.username || "Me";
      const avatarUrl = currentUser?.avatarUrl || null;
      const fullName = currentUser?.fullName || null;

      const previousMessages = queryClient.getQueryData(queryKeys.messages(conversationId));

      const optimisticMessage = {
        id: tempId,
        content: content,
        conversationId,
        userId: userId,
        createdAt: new Date().toISOString(),
        user: { id: userId, username: username, avatarUrl: avatarUrl, fullName: fullName },
        isEdited: false,
        deletedAt: null,
        pending: true,
        isThreadBroadcast,
        attachments: (optimisticAttachments || []) as import("../types/message").ClientAttachment[],
      };

      if (threadRootId) {
        queryClient.setQueryData(
          [...queryKeys.messages(conversationId), "thread", threadRootId],
          (old: ThreadData | undefined) => {
            if (!old) return old;
            return {
              ...old,
              replies: [...old.replies, optimisticMessage],
            };
          }
        );
        queryClient.setQueryData<InfiniteData<MessagePage>>(queryKeys.messages(conversationId), (old) => {
          if (!old || !old.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((m) =>
                m.id === threadRootId
                  ? {
                      ...m,
                      threadReplyCount: (m.threadReplyCount || 0) + 1,
                      lastThreadReplyAt: optimisticMessage.createdAt,
                    }
                  : m
              ),
            })),
          };
        });
      }
      
      if (!threadRootId || isThreadBroadcast) {
        queryClient.setQueryData<InfiniteData<MessagePage>>(queryKeys.messages(conversationId), (old) => {
          if (!old || !old.pages || old.pages.length === 0) return old;

          const newPages = [...old.pages];
          newPages[0] = {
            ...newPages[0],
            data: [optimisticMessage, ...newPages[0].data],
          };

          return {
            ...old,
            pages: newPages,
          };
        });
      }

      queryClient.setQueryData<Conversation[]>(queryKeys.conversations, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((conv) => {
          if (conv.id !== conversationId) return conv;
          return {
            ...conv,
            updatedAt: optimisticMessage.createdAt,
            latestMessageId: optimisticMessage.id,
            latestMessage: {
              id: optimisticMessage.id,
              userId: optimisticMessage.userId,
              content: optimisticMessage.content,
              deletedAt: null,
              createdAt: optimisticMessage.createdAt,
              user: {
                username: optimisticMessage.user.username,
                fullName: optimisticMessage.user.fullName,
              },
            },
          };
        });
      });

      return { previousMessages, localId: tempId };
    },
    onSuccess: (realMessage, variables, context) => {
      if (variables.threadRootId) {
        queryClient.setQueryData(
          [...queryKeys.messages(conversationId), "thread", variables.threadRootId],
          (old: ThreadData | undefined) => {
            if (!old || !old.replies) return old;
            const alreadyExists = old.replies.some((m: Message) => m.id === realMessage.id);
            return {
              ...old,
              replies: alreadyExists
                ? old.replies.filter((m: Message) => m.id !== context?.localId)
                : old.replies.map((m: Message) => (m.id === context?.localId ? realMessage : m))
            };
          }
        );
      }
      
      if (!variables.threadRootId || variables.isThreadBroadcast) {
        queryClient.setQueryData<InfiniteData<MessagePage>>(queryKeys.messages(conversationId), (old) => {
          if (!old || !old.pages) return old;

          const alreadyExists = old.pages.some(page => page.data.some(m => m.id === realMessage.id));

          const newPages = old.pages.map((page) => ({
            ...page,
            data: alreadyExists
              ? page.data.filter((m) => m.id !== context?.localId)
              : page.data.map((m) => (m.id === context?.localId ? realMessage : m))
          }));

          return {
            ...old,
            pages: newPages,
          };
        });
      }
    },
    onError: (err, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(queryKeys.messages(conversationId), context.previousMessages);
      }
      const rawMessage = err instanceof Error ? err.message : "";
      const lower = rawMessage.toLowerCase();
      const matched = Object.entries(COMMON_ERROR_MAP).find(([key]) => lower.includes(key));
      const errorMessage = matched ? matched[1] : rawMessage || "Failed to send message";
      if (lower.includes("too quickly")) {
        toast.error(errorMessage, {
          style: { backgroundColor: "#ef4444", color: "white", borderColor: "#ef4444" },
          icon: React.createElement(AlertTriangle, { color: "#fde047", size: 18 }),
          position: "top-right"
        });
      } else {
        toast.error(errorMessage);
      }
    },
  });
};

export const useEditMessageMutation = (conversationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string; threadRootId?: string | null }) => {
      return messagesApi.editMessage(conversationId, messageId, content);
    },
    onMutate: async ({ messageId, content, threadRootId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.messages(conversationId) });

      const previousMessages = queryClient.getQueryData<InfiniteData<MessagePage>>(
        queryKeys.messages(conversationId)
      );

      if (threadRootId) {
        queryClient.setQueryData(
          [...queryKeys.messages(conversationId), "thread", threadRootId],
          (old: ThreadData | undefined) => {
            if (!old || !old.replies) return old;
            return {
              ...old,
              replies: old.replies.map((m: Message) =>
                m.id === messageId ? { ...m, content, isEdited: true } : m
              ),
            };
          }
        );
      } else {
        queryClient.setQueryData<InfiniteData<MessagePage>>(
          queryKeys.messages(conversationId),
          (old) => {
            if (!old || !old.pages) return old;

            const updatedPages = old.pages.map((page) => ({
              ...page,
              data: page.data.map((m) =>
                m.id === messageId
                  ? { ...m, content, isEdited: true }
                  : m
              ),
            }));

            return {
              ...old,
              pages: updatedPages,
            };
          }
        );
      }

      return { previousMessages };
    },
    onSuccess: (serverMessage, variables) => {
      if (variables.threadRootId) {
        queryClient.setQueryData(
          [...queryKeys.messages(conversationId), "thread", variables.threadRootId],
          (old: ThreadData | undefined) => {
            if (!old || !old.replies) return old;
            return {
              ...old,
              replies: old.replies.map((m: Message) =>
                m.id === serverMessage.id ? { ...m, ...serverMessage } : m
              ),
            };
          }
        );
      } else {
        queryClient.setQueryData<InfiniteData<MessagePage>>(
          queryKeys.messages(conversationId),
          (old) => {
            if (!old || !old.pages) return old;

            const updatedPages = old.pages.map((page) => ({
              ...page,
              data: page.data.map((m) =>
                m.id === serverMessage.id ? { ...m, ...serverMessage } : m
              ),
            }));

            return {
              ...old,
              pages: updatedPages,
            };
          }
        );
      }
    },
    onError: (err, _variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(queryKeys.messages(conversationId), context.previousMessages);
      }
      toast.error(friendlyError(err, "Failed to edit message"));
    },
  });
};

export const useDeleteMessageMutation = (conversationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId }: { messageId: string; threadRootId?: string | null; isThreadRoot?: boolean }) => {
      return messagesApi.deleteMessage(conversationId, messageId);
    },
    onMutate: async ({ messageId, threadRootId, isThreadRoot }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.messages(conversationId) });

      const previousMessages = queryClient.getQueryData<InfiniteData<MessagePage>>(
        queryKeys.messages(conversationId)
      );

      const deletedAt = new Date().toISOString();

      if (threadRootId) {
        queryClient.setQueryData(
          [...queryKeys.messages(conversationId), "thread", threadRootId],
          (old: ThreadData | undefined) => {
            if (!old || !old.replies) return old;
            return {
              ...old,
              replies: old.replies.map((m: Message) =>
                m.id === messageId ? { ...m, deletedAt, content: "" } : m
              ),
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
                  m.id === threadRootId
                    ? { ...m, threadReplyCount: Math.max(0, (m.threadReplyCount || 0) - 1) }
                    : m
                ),
              })),
            };
          }
        );
      } else {
        queryClient.setQueryData<InfiniteData<MessagePage>>(
          queryKeys.messages(conversationId),
          (old) => {
            if (!old || !old.pages) return old;

            const updatedPages = old.pages.map((page) => ({
              ...page,
              data: page.data.map((m) => {
                if (m.id === messageId) {
                  return { ...m, deletedAt, content: "" };
                }
                return m;
              }),
            }));

            return {
              ...old,
              pages: updatedPages,
            };
          }
        );
        if (isThreadRoot) {
          queryClient.setQueryData(
            [...queryKeys.messages(conversationId), "thread", messageId],
            (old: ThreadData | undefined) => {
              if (!old || !old.root) return old;
              return {
                ...old,
                root: { ...old.root, deletedAt, content: "" },
                replies: old.replies.map((r: Message) => ({ ...r, deletedAt, content: "" })),
              };
            }
          );
        }
      }

      return { previousMessages };
    },
    onSuccess: (serverMessage, variables) => {
      if (variables.threadRootId) {
        queryClient.setQueryData(
          [...queryKeys.messages(conversationId), "thread", variables.threadRootId],
          (old: ThreadData | undefined) => {
            if (!old || !old.replies) return old;
            return {
              ...old,
              replies: old.replies.map((m: Message) =>
                m.id === serverMessage.id ? { ...m, ...serverMessage } : m
              ),
            };
          }
        );
      } else {
        queryClient.setQueryData<InfiniteData<MessagePage>>(
          queryKeys.messages(conversationId),
          (old) => {
            if (!old || !old.pages) return old;

            const updatedPages = old.pages.map((page) => ({
              ...page,
              data: page.data.map((m) =>
                m.id === serverMessage.id ? { ...m, ...serverMessage } : m
              ),
            }));

            return {
              ...old,
              pages: updatedPages,
            };
          }
        );
      }
    },
    onError: (err, _variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(queryKeys.messages(conversationId), context.previousMessages);
      }
      toast.error(friendlyError(err, "Failed to delete message"));
    },
  });
};
