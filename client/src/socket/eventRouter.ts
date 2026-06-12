import type { QueryClient } from "@tanstack/react-query";
import { handleMessageNew } from "./handlers/message.handlers";
import { handleMessageRead, handleConversationNew, handleConversationUpdate } from "./handlers/conversation.handlers";

export const createChatEventRouter = (queryClient: QueryClient) => {
  return {
    messageNew: handleMessageNew(queryClient),
    messageRead: handleMessageRead(queryClient),
    conversationNew: handleConversationNew(queryClient),
    conversationUpdate: handleConversationUpdate(queryClient),
  };
};
