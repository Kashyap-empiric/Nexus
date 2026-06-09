import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/constants/queryKeys";
import type { Conversation } from "../types/conversation";
import type { MessageReadPayload } from "../types/socket";

export const handleMessageRead = (queryClient: QueryClient) => {
  return (data: MessageReadPayload) => {
    if (!data.conversationId || !data.userId || !data.lastReadMessageId) return;

    queryClient.setQueryData<Conversation[]>(
      queryKeys.conversations,
      (oldData) => {
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

          return { ...conv, members: updatedMembers };
        });
      }
    );
  };
};
