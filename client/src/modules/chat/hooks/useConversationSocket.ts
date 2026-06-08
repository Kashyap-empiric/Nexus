"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "@/shared/lib/socket";
import { SOCKET_EVENTS } from "@/shared/socket-events";
import { queryKeys } from "@/shared/constants/queryKeys";
import type { Message, MessagePage } from "../types/message";
import { InfiniteData } from "@tanstack/react-query";

export const useConversationSocket = (conversationId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;

    const onMessageNew = (message: Message) => {
      try {
        if (!message || !message.id) throw new Error("Invalid payload");
        if (message.conversationId !== conversationId) return;

        queryClient.setQueryData<InfiniteData<MessagePage>>(
          queryKeys.messages(conversationId),
          (oldData) => {
            if (!oldData || !oldData.pages) return oldData;

            const updatedPages = oldData.pages.map((page, index) => {
              if (index === 0) {
                // Check if optimistic message already exists
                const exists = page.data.some((m) => m.id === message.id || m.pending);
                if (exists) {
                  return {
                    ...page,
                    data: page.data.map((m) => (m.pending ? message : m)),
                  };
                }
                return {
                  ...page,
                  data: [message, ...page.data],
                };
              }
              return page;
            });

            return {
              ...oldData,
              pages: updatedPages,
            };
          }
        );
      } catch (err) {
        console.error("Failed to parse incoming message", err);
      }
    };

    socket.on(SOCKET_EVENTS.MESSAGE_NEW, onMessageNew);

    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE_NEW, onMessageNew);
    };
  }, [conversationId, queryClient]);
};
