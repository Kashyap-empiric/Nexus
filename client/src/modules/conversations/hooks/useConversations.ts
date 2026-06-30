import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as conversationsApi from "../api/conversations.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import type { Conversation } from "../types/conversation";

export type { Conversation };

export const useConversationsQuery = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.conversations,
    queryFn: conversationsApi.getConversations,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return { data, isLoading, isError, error };
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: string; messageId: string }) =>
      conversationsApi.markConversationRead(conversationId, messageId),
    onMutate: async ({ conversationId }) => {
      // Cancel any outgoing queries that might overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.conversations });
      await queryClient.cancelQueries({ queryKey: ["workspace-channels"] });
      const queries = queryClient.getQueriesData<Conversation[]>({ queryKey: ["workspace-channels"] });

      // Snapshot previous values for rollback on error
      const previousConversations = queryClient.getQueryData<Conversation[]>(queryKeys.conversations);
      const previousChannelQueries = queries.map(([key, data]) => ({ key, data }));

      // Optimistically clear unreadCount for this conversation
      const updateCache = (oldData: Conversation[] | undefined) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map((conv) =>
          conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
        );
      };

      queryClient.setQueryData<Conversation[]>(queryKeys.conversations, updateCache);

      queries.forEach(([key]) => {
        queryClient.setQueryData<Conversation[]>(key, updateCache);
      });

      return { previousConversations, previousChannelQueries };
    },
    onError: (_err, _variables, context) => {
      // Rollback to the previous values on error
      if (context?.previousConversations) {
        queryClient.setQueryData(queryKeys.conversations, context.previousConversations);
      }
      if (context?.previousChannelQueries) {
        context.previousChannelQueries.forEach(({ key, data }) => {
          if (data) {
            queryClient.setQueryData(key, data);
          }
        });
      }
    },
    // No onSettled invalidation: the server emits message:read via socket after the DB
    // write completes. handleMessageRead in conversation.handlers.ts picks that up and
    // sets unreadCount: 0. An immediate refetch here races the DB write and restores
    // the stale count, causing the badge to reappear on every channel visit.
  });
};
