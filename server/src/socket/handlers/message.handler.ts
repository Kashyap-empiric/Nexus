import type { Server, Socket } from "socket.io";
import { createMessage } from "@/modules/messages/messages.service.js";
import { SOCKET_EVENTS } from "@/shared/socket-events.js";

export const registerMessageHandlers = (io: Server, socket: Socket) => {
  socket.on(SOCKET_EVENTS.MESSAGE_SEND, async (payload: { tempId: string; conversationId: string; content: string }, callback) => {
    try {
      const userId = socket.data.user?.id;
      if (!userId) {
        return callback?.({ error: "Unauthorized" });
      }

      // Persist the message via the service (DB is the source of truth)
      const message = await createMessage(payload.conversationId, userId, payload.content);

      // Broadcast the saved message to all participants in the conversation room
      io.to(`conversation:${payload.conversationId}`).emit(SOCKET_EVENTS.MESSAGE_NEW, message);

      // Acknowledge the sender with the saved message and their tempId
      if (callback) {
        callback({
          success: true,
          tempId: payload.tempId,
          message: message,
        });
      }
    } catch (error) {
      console.error("[Socket.io] Error sending message:", error);
      if (callback) {
        callback({ error: "Internal Server Error" });
      }
    }
  });
};
