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
    [SOCKET_EVENTS.CONVERSATION_NEW]: router.conversationNew,
    [SOCKET_EVENTS.CONVERSATION_UPDATE]: router.conversationUpdate,
  }), [router]);

  useSocketEvents(events);
};
