import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "@/lib/socket";
import { SOCKET_EVENTS } from "@/shared/socket-events";
import { queryKeys } from "@/constants/queryKeys";

export const useConversationSocket = (conversationId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;

    const onMessageNew = (message: any) => {
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
    };

    const onMessageRead = (data: any) => {
      if (data.conversationId !== conversationId) return;
      
      // Update read receipt cache if we implement it, or just invalidate
      // For now, no-op or specific cache mutation as needed
    };

    socket.on(SOCKET_EVENTS.MESSAGE_NEW, onMessageNew);
    socket.on(SOCKET_EVENTS.MESSAGE_READ, onMessageRead);

    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE_NEW, onMessageNew);
      socket.off(SOCKET_EVENTS.MESSAGE_READ, onMessageRead);
    };
  }, [conversationId, queryClient]);
};
