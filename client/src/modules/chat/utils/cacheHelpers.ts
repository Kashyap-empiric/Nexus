import { QueryClient, InfiniteData } from "@tanstack/react-query";
import { queryKeys } from "@/shared/constants/queryKeys";
import type { MessagePage, Message } from "../types/message";
import type { Conversation } from "../types/conversation";

export const updateMessageInCache = (
  queryClient: QueryClient,
  conversationId: string,
  messageId: string,
  newContent: string,
  isEdited: boolean = true
) => {
  queryClient.setQueryData<InfiniteData<MessagePage>>(
    queryKeys.messages(conversationId),
    (old) => {
      if (!old || !old.pages) return old;

      const newPages = old.pages.map((page) => ({
        ...page,
        data: page.data.map((m) =>
          m.id === messageId ? { ...m, content: newContent, isEdited } : m
        ),
      }));

      return {
        ...old,
        pages: newPages,
      };
    }
  );
  // Note: We no longer update conversation metadata (latestMessage, latestMessageId) here.
  // It is now strictly handled by CONVERSATION_UPDATE socket events.
};

export const markMessageDeletedInCache = (
  queryClient: QueryClient,
  conversationId: string,
  messageId: string,
  deletedAt: string = new Date().toISOString()
) => {
  queryClient.setQueryData<InfiniteData<MessagePage>>(
    queryKeys.messages(conversationId),
    (old) => {
      if (!old || !old.pages) return old;

      const newPages = old.pages.map((page) => ({
        ...page,
        data: page.data.map((m) =>
          m.id === messageId ? { ...m, deletedAt } : m
        ),
      }));

      return {
        ...old,
        pages: newPages,
      };
    }
  );
  // Note: We no longer update conversation metadata (latestMessage, latestMessageId) here.
  // It is now strictly handled by CONVERSATION_UPDATE socket events.
};
