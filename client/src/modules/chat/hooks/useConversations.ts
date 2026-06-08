import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as conversationsApi from "../api/conversations.api";
import { queryKeys } from "@/shared/constants/queryKeys";

export interface User {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface ConversationMember {
  id: string;
  userId: string;
  user: User;
}

export interface Conversation {
  id: string;
  type: "DM" | "CHANNEL";
  isPrivate: boolean;
  name: string | null;
  dmPair: string | null;
  members: ConversationMember[];
  updatedAt: string;
}

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
};

export const useMarkConversationReadMutation = () => {
  return useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: string; messageId: string }) =>
      conversationsApi.markConversationRead(conversationId, messageId),
  });
};
