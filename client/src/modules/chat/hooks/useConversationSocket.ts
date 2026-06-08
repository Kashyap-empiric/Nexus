"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "@/shared/lib/socket";
import { SOCKET_EVENTS } from "@/shared/socket-events";
import { queryKeys } from "@/shared/constants/queryKeys";

export const useConversationSocket = (conversationId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;

    const onMessageNew = (message: any) => {
      try {
        if (!message || !message.id) throw new Error("Invalid payload");
        if (message.conversationId !== conversationId) return;

        queryClient.setQueryData(
          queryKeys.messages(conversationId),
          (oldData: any) => {
            if (!oldData || !oldData.pages) return oldData;

            const updatedPages = oldData.pages.map((page: any, index: number) => {
              if (index === 0) {
                // Check if optimistic message already exists
                const exists = page.data.some((m: any) => m.id === message.id || m.pending);
                if (exists) {
                  return {
                    ...page,
                    data: page.data.map((m: any) => (m.pending ? message : m)),
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
        queryClient.setQueryData(
          queryKeys.conversations,
          (oldData: any) => {
            if (!Array.isArray(oldData)) return oldData;

            return oldData.map((conv: any) => {
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

    const onMessageRead = (data: { conversationId: string; userId: string; messageId: string }) => {
      if (!data.conversationId || !data.userId || !data.messageId) return;

      queryClient.setQueryData(
        queryKeys.conversations,
        (oldData: any) => {
          if (!Array.isArray(oldData)) return oldData;

          return oldData.map((conv: any) => {
            if (conv.id !== data.conversationId) return conv;

            const updatedMembers = conv.members.map((member: any) => {
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
