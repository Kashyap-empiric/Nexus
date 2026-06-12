"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SOCKET_EVENTS } from "@/socket/socket-events";
import { useSocketEvents } from "@/socket/useSocketEvent";
import { createChatEventRouter } from "@/socket/eventRouter";

export const useGlobalSocket = () => {
  const queryClient = useQueryClient();
  const router = useMemo(() => createChatEventRouter(queryClient), [queryClient]);

  const events = useMemo(() => ({
    [SOCKET_EVENTS.MESSAGE_NEW]: router.messageNew,
    [SOCKET_EVENTS.MESSAGE_READ]: router.messageRead,
    [SOCKET_EVENTS.MESSAGE_UPDATE]: router.messageUpdate,
    [SOCKET_EVENTS.MESSAGE_DELETE]: router.messageDelete,
    [SOCKET_EVENTS.CONVERSATION_NEW]: router.conversationNew,
    [SOCKET_EVENTS.CONVERSATION_UPDATE]: router.conversationUpdate,
    [SOCKET_EVENTS.WORKSPACE_UPDATE]: router.workspaceUpdate,
    [SOCKET_EVENTS.CHANNEL_UPDATE]: router.channelUpdate,
    [SOCKET_EVENTS.MEMBER_UPDATE]: router.memberUpdate,
    [SOCKET_EVENTS.NOTIFICATION_NEW]: router.notificationNew,
  }), [router]);

  useSocketEvents(events);
};
