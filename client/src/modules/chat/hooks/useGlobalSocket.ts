"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "@/shared/lib/socket";
import { SOCKET_EVENTS } from "@/shared/socket-events";
import { createChatEventRouter } from "../realtime";

export const useGlobalSocket = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const router = createChatEventRouter(queryClient);

    socket.on(SOCKET_EVENTS.MESSAGE_NEW, router.messageNew);
    socket.on(SOCKET_EVENTS.MESSAGE_READ, router.messageRead);
    socket.on(SOCKET_EVENTS.CONVERSATION_NEW, router.conversationNew);
    socket.on(SOCKET_EVENTS.CONVERSATION_UPDATE, router.conversationUpdate);

    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE_NEW, router.messageNew);
      socket.off(SOCKET_EVENTS.MESSAGE_READ, router.messageRead);
      socket.off(SOCKET_EVENTS.CONVERSATION_NEW, router.conversationNew);
      socket.off(SOCKET_EVENTS.CONVERSATION_UPDATE, router.conversationUpdate);
    };
  }, [queryClient]);
};
