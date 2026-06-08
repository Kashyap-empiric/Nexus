"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "@/shared/lib/socket";
import { SOCKET_EVENTS } from "@/shared/socket-events";
import { queryKeys } from "@/shared/constants/queryKeys";
import type { Message, MessagePage } from "../types/message";
import type { Conversation } from "../types/conversation";
import type { MessageReadPayload } from "../types/socket";
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

        // Also update the conversations list cache
        queryClient.setQueryData<Conversation[]>(
          queryKeys.conversations,
          (oldData) => {
            if (!Array.isArray(oldData)) return oldData;

            return oldData.map((conv) => {
              if (conv.id !== message.conversationId) return conv;
              
              return {
                ...conv,
                updatedAt: new Date().toISOString(),
                messages: [message],
              };
            });
          }
        );
      } catch (err) {
        console.error("Failed to parse incoming message", err);
      }
    };

    const onMessageRead = (data: MessageReadPayload) => {
      if (!data.conversationId || !data.userId || !data.messageId) return;

      queryClient.setQueryData<Conversation[]>(
        queryKeys.conversations,
        (oldData) => {
          if (!Array.isArray(oldData)) return oldData;

          return oldData.map((conv) => {
            if (conv.id !== data.conversationId) return conv;

            const updatedMembers = conv.members.map((member) => {
              if (member.userId !== data.userId) return member;
              
              // Only move cursor forward
              if (!member.lastReadMessageId || data.messageId > member.lastReadMessageId) {
                return { ...member, lastReadMessageId: data.messageId };
              }
              return member;
            });

            return { ...conv, members: updatedMembers };
          });
        }
      );
    };

    socket.on(SOCKET_EVENTS.MESSAGE_NEW, onMessageNew);
    socket.on(SOCKET_EVENTS.MESSAGE_READ, onMessageRead);

    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE_NEW, onMessageNew);
      socket.off(SOCKET_EVENTS.MESSAGE_READ, onMessageRead);
    };
  }, [conversationId, queryClient]);
};
