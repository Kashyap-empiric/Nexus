import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as messagesApi from "../api/messages.api";
import { queryKeys } from "@/constants/queryKeys";
import type { User } from "./useConversations";

export interface Message {
  id: string;
  content: string;
  conversationId: string;
  userId: string;
  createdAt: string;
  user: User;
  optimistic?: boolean;
}

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
    mutationFn: (content: string) => messagesApi.createMessage(conversationId, content),
    onMutate: async (newContent) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.messages(conversationId) });

      const userId = currentUser?.id || "me";
      const username = currentUser?.username || "Me";
      const avatarUrl = currentUser?.avatarUrl || null;

      const previousMessages = queryClient.getQueryData(queryKeys.messages(conversationId));

      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        content: newContent,
        conversationId,
        userId: userId,
        createdAt: new Date().toISOString(),
        user: { id: userId, username: username, avatarUrl: avatarUrl },
        pending: true,
      };

      queryClient.setQueryData(queryKeys.messages(conversationId), (old: any) => {
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

      return { previousMessages, localId: optimisticMessage.id };
    },
    onSuccess: (realMessage, variables, context) => {
      queryClient.setQueryData(queryKeys.messages(conversationId), (old: any) => {
        if (!old || !old.pages) return old;

        const newPages = old.pages.map((page: any) => ({
          ...page,
          data: page.data.map((m: any) => 
            m.id === context?.localId ? realMessage : m
          )
        }));

        return {
          ...old,
          pages: newPages,
        };
      });
    },
    onError: (err, newContent, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(queryKeys.messages(conversationId), context.previousMessages);
      }
    },
  });
};
