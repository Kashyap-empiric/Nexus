import type { Server, Socket } from "socket.io";
import { createMessage } from "@/modules/messages/messages.service.js";
import { SOCKET_EVENTS } from "@/shared/socket-events.js";
import { dispatchMessageEvent } from "../socket.dispatcher.js";
import { verifyConversationMembership } from "@/shared/permissions.js";
import { findById } from "@/modules/conversations/conversations.repository.js";
import { sendPushNotification } from "@/services/push.service.js";
import { prisma } from "@/lib/db.js";

export const registerMessageHandlers = (io: Server, socket: Socket) => {
  socket.on(
    SOCKET_EVENTS.MESSAGE_SEND,
    async (
      payload: { tempId: string; conversationId: string; content: string; replyToId?: string },
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

        const { message, conversationMetadata } = await createMessage(
          payload.conversationId,
          userId,
          payload.content,
          payload.replyToId
        );

        dispatchMessageEvent("NEW", payload.conversationId, message, conversationMetadata);

        findById(payload.conversationId).then(async (conv) => {
          if (!conv) return;

          const pushPromises = conv.members.map(async (member) => {
            if (member.userId === userId) return;

            const memberUser = await prisma.user.findUnique({
              where: { id: member.userId },
              select: { pushNotificationsEnabled: true, dmNotifications: true, channelNotifications: true, mentionNotifications: true, username: true }
            });

            if (!memberUser || !memberUser.pushNotificationsEnabled) return;

            const isMentioned = payload.content.includes(`@${memberUser.username}`);
            let shouldSendPush = false;

            if (conv.type === "DM" && memberUser.dmNotifications) {
              shouldSendPush = true;
            } else if (conv.type === "CHANNEL") {
              if (memberUser.channelNotifications || (memberUser.mentionNotifications && isMentioned)) {
                shouldSendPush = true;
              }
            }

            if (shouldSendPush) {
              let title = message.user.username;
              if (conv.type === "CHANNEL" && conv.name) {
                title = `${message.user.username} in #${conv.name}`;
              }

              return sendPushNotification(member.userId, {
                title,
                body: message.content,
                url: `/conversations/${payload.conversationId}`,
                tag: payload.conversationId,
              });
            }
          });

          Promise.all(pushPromises).catch(err => console.error("[Push] Error sending push for message", err));
        }).catch(err => console.error("[Push] Failed to fetch conversation", err));

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