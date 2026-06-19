import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/constants/queryKeys";
import type { Conversation } from "@/modules/conversations/types/conversation";
import type { MessageReadPayload, ConversationUpdatePayload } from "@/modules/chat/types/socket";

import { getAuthUser } from "@/modules/auth/store/useAuthStore";

export const handleMessageRead = (queryClient: QueryClient) => {
  return (data: MessageReadPayload) => {
    if (!data.conversationId || !data.userId || !data.lastReadMessageId) return;

    const currentUser = getAuthUser();
    const isCurrentUser = data.userId === currentUser?.id;

    const updateCache = (oldData: Conversation[] | undefined): Conversation[] | undefined => {
      if (!Array.isArray(oldData)) return oldData;

      return oldData.map((conv) => {
        if (conv.id !== data.conversationId) return conv;

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
    };

    queryClient.setQueryData<Conversation[]>(
      queryKeys.conversations,
      (oldData) => updateCache(oldData)
    );

    const queries = queryClient.getQueriesData<Conversation[]>({ queryKey: ["workspace-channels"] });
    queries.forEach(([queryKey]) => {
      queryClient.setQueryData<Conversation[]>(
        queryKey,
        (oldData) => updateCache(oldData)
      );
    });

    if (isCurrentUser) {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    }
  };
};

export const handleConversationNew = (queryClient: QueryClient) => {
  return (conversation: Conversation) => {
    if (!conversation?.id) return;

    queryClient.setQueryData<Conversation[]>(
      queryKeys.conversations,
      (oldData) => {
        if (!Array.isArray(oldData)) return oldData;

        const exists = oldData.some((conv) => conv.id === conversation.id);
        if (exists) return oldData;

        return [conversation, ...oldData];
      }
    );

    if (conversation.workspaceId) {
      queryClient.setQueryData<Conversation[]>(
        ["workspace-channels", conversation.workspaceId],
        (oldData) => {
          if (!Array.isArray(oldData)) return oldData;

          const exists = oldData.some((ch) => ch.id === conversation.id);
          if (exists) return oldData;

          return [...oldData, conversation];
        }
      );
    }
  };
};

export const handleConversationUpdate = (queryClient: QueryClient) => {
  return (payload: ConversationUpdatePayload) => {
    if (!payload?.conversation?.id) return;

    const updateCache = (oldData: Conversation[] | undefined, shouldSort: boolean = false): Conversation[] | undefined => {
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

      if (shouldSort) {
        return updatedData.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      }
      return updatedData;
    };

    queryClient.setQueryData<Conversation[]>(
      queryKeys.conversations,
      (oldData) => updateCache(oldData, true)
    );

    const queries = queryClient.getQueriesData<Conversation[]>({ queryKey: ["workspace-channels"] });
    queries.forEach(([queryKey]) => {
      queryClient.setQueryData<Conversation[]>(
        queryKey,
        (oldData) => updateCache(oldData, false)
      );
    });
  };
};
