"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "@/shared/lib/socket";
import { SOCKET_EVENTS } from "@/shared/socket-events";
import { queryKeys } from "@/shared/constants/queryKeys";
import type { Message } from "../types/message";
import type { Conversation } from "../types/conversation";
import type { MessageReadPayload } from "../types/socket";

export const useGlobalSocket = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const onMessageNew = (message: Message) => {
      try {
        if (!message || !message.id) throw new Error("Invalid payload");

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

        // Dynamic Browser Tab Unread Badge
        if (typeof document !== "undefined" && document.hidden) {
          const originalTitle = document.title.replace(/^\(\d+\)\s/, "");
          document.title = `(1) New Message! - ${originalTitle}`;
          
          const onFocus = () => {
             document.title = originalTitle;
             window.removeEventListener("focus", onFocus);
          };
          window.addEventListener("focus", onFocus);
        }
      } catch (err) {
        console.error("Failed to parse incoming message", err);
      }
    };

    const onMessageRead = (data: MessageReadPayload) => {
      if (!data.conversationId || !data.userId || !data.lastReadMessageId) return;

      queryClient.setQueryData<Conversation[]>(
        queryKeys.conversations,
        (oldData) => {
          if (!Array.isArray(oldData)) return oldData;

          return oldData.map((conv) => {
            if (conv.id !== data.conversationId) return conv;

            const updatedMembers = conv.members.map((member) => {
              if (member.userId !== data.userId) return member;
              
              if (!member.lastReadMessageId || data.lastReadMessageId > member.lastReadMessageId) {
                return { ...member, lastReadMessageId: data.lastReadMessageId };
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
  }, [queryClient]);
};
