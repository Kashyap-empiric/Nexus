import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as conversationsApi from "../api/conversations.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import type { Conversation } from "../types/conversation";

export type { Conversation };

export const useConversationsQuery = () => {
  return useQuery({
    queryKey: queryKeys.conversations,
    queryFn: conversationsApi.getConversations,
  });
};

export const useConversationDetailsQuery = (id: string) => {
  return useQuery({
    queryKey: queryKeys.conversation(id),
    queryFn: () => conversationsApi.getConversationDetails(id),
    enabled: !!id,
  });
};

export const useCreateConversationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: conversationsApi.createConversation,
    onSuccess: (conversation) => {
      // Directly prepend the new conversation to the cache so the sidebar updates instantly.
      // The receiver's sidebar is updated via the `conversation:new` socket event.
      queryClient.setQueryData<Conversation[]>(
        queryKeys.conversations,
        (oldData) => {
          if (!Array.isArray(oldData)) return oldData;
          const exists = oldData.some((c) => c.id === conversation.id);
          if (exists) return oldData;
          return [conversation, ...oldData];
        }
      );
    },
  });
};

export const useMarkConversationReadMutation = () => {
  return useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: string; messageId: string }) =>
      conversationsApi.markConversationRead(conversationId, messageId),
  });
};
