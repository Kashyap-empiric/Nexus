import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as messagesApi from "../api/messages.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import { socket } from "@/socket/socketClient";
import { SOCKET_EVENTS } from "@/socket/socket-events";
import type { User, Conversation } from "@/modules/conversations/types/conversation";
import type { Message, MessagePage } from "../types/message";
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
  });
};

export const useSendMessageMutation = (conversationId: string, currentUser?: User | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, tempId, replyToId }: MessageSendPayload) => {
      return new Promise<Message>((resolve, reject) => {
        socket.emit(SOCKET_EVENTS.MESSAGE_SEND, { conversationId, content, tempId, replyToId }, (response: SocketResponse<Message>) => {
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
    onMutate: async ({ content, tempId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.messages(conversationId) });

      const userId = currentUser?.id || "me";
      const username = currentUser?.username || "Me";

      const previousMessages = queryClient.getQueryData(queryKeys.messages(conversationId));

      const optimisticMessage = {
        id: tempId,
        content: content,
        conversationId,
        userId: userId,
        createdAt: new Date().toISOString(),
        user: { id: userId, username: username, avatarUrl: currentUser?.avatarUrl || null, fullName: currentUser?.fullName || null },
        isEdited: false,
        deletedAt: null,
        pending: true,
      };

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
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      return messagesApi.editMessage(conversationId, messageId, content);
    },
    onMutate: async ({ messageId, content }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.messages(conversationId) });

      const previousMessages = queryClient.getQueryData<InfiniteData<MessagePage>>(
        queryKeys.messages(conversationId)
      );

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

      return { previousMessages };
    },
    onSuccess: (serverMessage) => {
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
    mutationFn: async ({ messageId }: { messageId: string }) => {
      return messagesApi.deleteMessage(conversationId, messageId);
    },
    onMutate: async ({ messageId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.messages(conversationId) });

      const previousMessages = queryClient.getQueryData<InfiniteData<MessagePage>>(
        queryKeys.messages(conversationId)
      );

      queryClient.setQueryData<InfiniteData<MessagePage>>(
        queryKeys.messages(conversationId),
        (old) => {
          if (!old || !old.pages) return old;

          const deletedAt = new Date().toISOString();

          const updatedPages = old.pages.map((page) => ({
            ...page,
            data: page.data.map((m) =>
              m.id === messageId
                ? { ...m, deletedAt, content: "" }
                : m
            ),
          }));

          return {
            ...old,
            pages: updatedPages,
          };
        }
      );

      return { previousMessages };
    },
    onSuccess: (serverMessage) => {
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
    },
    onError: (err, _variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(queryKeys.messages(conversationId), context.previousMessages);
      }
      toast.error(friendlyError(err, "Failed to delete message"));
    },
  });
};
