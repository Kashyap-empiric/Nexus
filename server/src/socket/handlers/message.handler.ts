import type { Server, Socket } from "socket.io";
import { createMessage } from "@/modules/messages/messages.service.js";
import { SOCKET_EVENTS } from "@/shared/socket-events.js";
import { dispatchMessageEvent } from "../socket.dispatcher.js";

export const registerMessageHandlers = (io: Server, socket: Socket) => {
  socket.on(
    SOCKET_EVENTS.MESSAGE_SEND,
    async (
      payload: { tempId: string; conversationId: string; content: string },
      callback
    ) => {
      try {
        const userId = socket.data.user?.id;

        if (!userId) {
          return callback?.({
            success: false,
            error: {
              code: "UNAUTHORIZED",
              message: "User not authenticated",
              retryable: false,
            },
          });
        }

        if (!payload?.content || !payload?.conversationId) {
          return callback?.({
            success: false,
            error: {
              code: "INVALID_PAYLOAD",
              message: "Missing required fields",
              retryable: false,
            },
          });
        }

        const { message, conversationMetadata } = await createMessage(
          payload.conversationId,
          userId,
          payload.content
        );

        dispatchMessageEvent("NEW", payload.conversationId, message, conversationMetadata);

        return callback?.({
          success: true,
          data: message,
        });
      } catch (error) {
        console.error("[Socket.io MESSAGE_SEND]", error);

        return callback?.({
          success: false,
          error: {
            code: "MESSAGE_SEND_FAILED",
            message: "Failed to send message",
            retryable: true,
          },
        });
      }
    }
  );
};