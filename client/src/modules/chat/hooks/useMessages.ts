import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as messagesApi from "../api/messages.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import { socket } from "@/shared/lib/socket";
import { SOCKET_EVENTS } from "@/shared/socket-events";
import type { User, Conversation } from "../types/conversation";
import type { Message, MessagePage } from "../types/message";
import type { SocketResponse, MessageSendPayload } from "../types/socket";
import { InfiniteData } from "@tanstack/react-query";
import { toast } from "sonner";
import React from "react";
import { AlertTriangle } from "lucide-react";

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
    mutationFn: ({ content, tempId }: MessageSendPayload) => {
      return new Promise<Message>((resolve, reject) => {
        socket.emit(SOCKET_EVENTS.MESSAGE_SEND, { conversationId, content, tempId }, (response: SocketResponse<Message>) => {
          if (response?.error) {
            // error can be a string (rate limiter) or a structured object { code, message, retryable }
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
      const avatarUrl = currentUser?.avatarUrl || null;

      const previousMessages = queryClient.getQueryData(queryKeys.messages(conversationId));

      const optimisticMessage = {
        id: tempId,
        content: content,
        conversationId,
        userId: userId,
        createdAt: new Date().toISOString(),
        user: { id: userId, username: username, avatarUrl: avatarUrl },
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

      // Optimistically update the conversations list to bring it to top
      queryClient.setQueryData<Conversation[]>(queryKeys.conversations, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((conv) => {
          if (conv.id !== conversationId) return conv;
          return {
            ...conv,
            updatedAt: optimisticMessage.createdAt,
            messages: [optimisticMessage as unknown as Message], // partial message for preview
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
      const errorMessage = err instanceof Error ? err.message : "Failed to send message";
      if (errorMessage.includes("too quickly")) {
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
      const previousMessages = queryClient.getQueryData(queryKeys.messages(conversationId));

      import("../utils/cacheHelpers").then(({ updateMessageInCache }) => {
        updateMessageInCache(queryClient, conversationId, messageId, content, true);
      });

      return { previousMessages };
    },
    onError: (err, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(queryKeys.messages(conversationId), context.previousMessages);
      }
      toast.error(err instanceof Error ? err.message : "Failed to edit message");
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
      const previousMessages = queryClient.getQueryData(queryKeys.messages(conversationId));

      import("../utils/cacheHelpers").then(({ markMessageDeletedInCache }) => {
        markMessageDeletedInCache(queryClient, conversationId, messageId, new Date().toISOString());
      });

      return { previousMessages };
    },
    onError: (err, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(queryKeys.messages(conversationId), context.previousMessages);
      }
      toast.error(err instanceof Error ? err.message : "Failed to delete message");
    },
  });
};
