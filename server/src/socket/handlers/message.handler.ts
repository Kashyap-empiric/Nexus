import type { Server, Socket } from "socket.io";
import type { Message } from "@prisma/client";
import { createMessage, sendMessageNotifications } from "@/modules/messages/messages.service.js";
import { SOCKET_EVENTS } from "@/shared/socket-events.js";
import { dispatchMessageEvent } from "../socket.dispatcher.js";
import { verifyConversationMembership } from "@/shared/permissions.js";

type MessageSendCallback = (response: {
  success: boolean;
  data?: Message;
  error?: { code: string; message: string; retryable: boolean };
}) => void;

export const registerMessageHandlers = (io: Server, socket: Socket) => {
  socket.on(
    SOCKET_EVENTS.TYPING_START,
    (payload: { conversationId: string; username: string }) => {
      if (!payload?.conversationId || !socket.data.user?.id) return;

      socket.to(`conversation:${payload.conversationId}`).emit(SOCKET_EVENTS.TYPING_START, {
        conversationId: payload.conversationId,
        userId: socket.data.user.id,
        username: payload.username || "Unknown",
      });
    }
  );

  socket.on(
    SOCKET_EVENTS.TYPING_STOP,
    (payload: { conversationId: string }) => {
      if (!payload?.conversationId || !socket.data.user?.id) return;

      socket.to(`conversation:${payload.conversationId}`).emit(SOCKET_EVENTS.TYPING_STOP, {
        conversationId: payload.conversationId,
        userId: socket.data.user.id,
      });
    }
  );
  socket.on(
    SOCKET_EVENTS.MESSAGE_SEND,
    async (
      payload: { tempId: string; conversationId: string; content: string; replyToId?: string; threadRootId?: string; isThreadBroadcast?: boolean; attachmentIds?: string[] },
      callback: MessageSendCallback
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

        const hasContent = typeof payload?.content === "string" && payload.content.trim().length > 0;
        const hasAttachments = Array.isArray(payload?.attachmentIds) && payload.attachmentIds.length > 0;

        if (!payload?.conversationId || (!hasContent && !hasAttachments)) {
          return callback?.({
            success: false,
            error: {
              code: "INVALID_PAYLOAD",
              message: "Missing required fields",
              retryable: false,
            },
          });
        }

        const isMember = await verifyConversationMembership(userId, payload.conversationId);
        if (!isMember) {
          return callback?.({
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "Not a member of this conversation",
              retryable: false,
            },
          });
        }

        const { message, conversationMetadata, parentMessageUserId } = await createMessage(
          payload.conversationId,
          userId,
          payload.content,
          payload.replyToId,
          payload.threadRootId,
          payload.isThreadBroadcast,
          payload.attachmentIds
        );

        dispatchMessageEvent("NEW", payload.conversationId, message, conversationMetadata);

        
        sendMessageNotifications(
          payload.conversationId,
          userId,
          message.user?.username || "Unknown",
          payload.content,
          parentMessageUserId
        );


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