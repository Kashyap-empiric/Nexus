import type { QueryClient } from "@tanstack/react-query";
import { handleMessageNew, handleMessageUpdate, handleMessageDelete, handlePinEvent } from "./handlers/message.handlers";
import { handleMessageRead, handleConversationNew, handleConversationUpdate } from "./handlers/conversation.handlers";
import { handleWorkspaceUpdate, handleChannelUpdate, handleMemberUpdate, handleChannelMemberAdded, handleChannelMemberRemoved } from "./handlers/workspace.handlers";
import { handleNotificationNew, handleNotificationUpdate } from "./handlers/notification.handlers";

export const createChatEventRouter = (queryClient: QueryClient) => {
  return {
    messageNew: handleMessageNew(queryClient),
    messageRead: handleMessageRead(queryClient),
    messageUpdate: handleMessageUpdate(queryClient),
    messageDelete: handleMessageDelete(queryClient),
    conversationNew: handleConversationNew(queryClient),
    conversationUpdate: handleConversationUpdate(queryClient),
    workspaceUpdate: handleWorkspaceUpdate(queryClient),
    channelUpdate: handleChannelUpdate(queryClient),
    memberUpdate: handleMemberUpdate(queryClient),
    channelMemberAdded: handleChannelMemberAdded(queryClient),
    channelMemberRemoved: handleChannelMemberRemoved(queryClient),
    messagePin: handlePinEvent(queryClient),
    messageUnpin: handlePinEvent(queryClient),
    notificationNew: handleNotificationNew(queryClient),
    notificationUpdate: handleNotificationUpdate(queryClient),
  };
};
