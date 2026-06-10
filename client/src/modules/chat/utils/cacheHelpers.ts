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

  // Update conversation preview if it's the latest message
  queryClient.setQueryData<Conversation[]>(queryKeys.conversations, (old) => {
    if (!Array.isArray(old)) return old;
    return old.map((conv) => {
      if (conv.id !== conversationId) return conv;
      if (conv.messages?.[0]?.id === messageId) {
        return {
          ...conv,
          messages: [{ ...conv.messages[0], content: newContent, isEdited } as Message],
        };
      }
      return conv;
    });
  });
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

  // Update conversation preview if it's the latest message
  queryClient.setQueryData<Conversation[]>(queryKeys.conversations, (old) => {
    if (!Array.isArray(old)) return old;
    return old.map((conv) => {
      if (conv.id !== conversationId) return conv;
      if (conv.messages?.[0]?.id === messageId) {
        return {
          ...conv,
          messages: [{ ...conv.messages[0], deletedAt } as Message],
        };
      }
      return conv;
    });
  });
};
