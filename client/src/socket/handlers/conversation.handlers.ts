import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/constants/queryKeys";
import type { Conversation } from "@/modules/conversations/types/conversation";
import type { MessageReadPayload, ConversationUpdatePayload } from "@/modules/chat/types/socket";

import { getAuthUser } from "@/modules/auth/store/useAuthStore";

export const handleMessageRead = (queryClient: QueryClient) => {
  return (data: MessageReadPayload) => {
    if (!data.conversationId || !data.userId || !data.lastReadMessageId) return;

    queryClient.setQueryData<Conversation[]>(
      queryKeys.conversations,
      (oldData) => {
        if (!Array.isArray(oldData)) return oldData;

        return oldData.map((conv) => {
          if (conv.id !== data.conversationId) return conv;

          const currentUser = getAuthUser();
          const isCurrentUser = data.userId === currentUser?.id;

          const updatedMembers = conv.members.map((member) => {
            if (member.userId !== data.userId) return member;

            if (
              !member.lastReadMessageId ||
              data.lastReadMessageId > member.lastReadMessageId
            ) {
              return { ...member, lastReadMessageId: data.lastReadMessageId };
            }
            return member;
          });

          return { 
            ...conv, 
            members: updatedMembers,
            unreadCount: isCurrentUser ? 0 : conv.unreadCount
          };
        });
      }
    );
  };
};

export const handleConversationNew = (queryClient: QueryClient) => {
  return (conversation: Conversation) => {
    if (!conversation?.id) return;

    queryClient.setQueryData<Conversation[]>(
      queryKeys.conversations,
      (oldData) => {
        if (!Array.isArray(oldData)) return oldData;

        // Avoid duplicates — only add if not already present
        const exists = oldData.some((conv) => conv.id === conversation.id);
        if (exists) return oldData;

        return [conversation, ...oldData];
      }
    );
  };
};

export const handleConversationUpdate = (queryClient: QueryClient) => {
  return (payload: ConversationUpdatePayload) => {
    if (!payload?.conversation?.id) return;

    queryClient.setQueryData<Conversation[]>(
      queryKeys.conversations,
      (oldData) => {
        if (!Array.isArray(oldData)) return oldData;

        const updatedData = oldData.map((conv) => {
          if (conv.id !== payload.conversation.id) return conv;

          return {
            ...conv,
            updatedAt: payload.conversation.updatedAt,
            latestMessageId: payload.conversation.latestMessageId,
            latestMessage: payload.conversation.latestMessage,
            name: payload.conversation.name !== undefined ? payload.conversation.name : conv.name,
            unreadCount: conv.unreadCount,
          };
        });

        // Re-sort the cached conversations array using updatedAt descending
        return updatedData.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      }
    );
  };
};
