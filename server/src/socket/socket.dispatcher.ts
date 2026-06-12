import { getIO } from "./socket.js";
import { SOCKET_EVENTS } from "../shared/socket-events.js";

import type { Socket } from "socket.io";
import type { Conversation, Message, ConversationMember } from "@prisma/client";

export type ConversationWithMembers = Conversation & {
  members: ConversationMember[];
};

export const dispatchConversationNew = async (conversation: ConversationWithMembers): Promise<void> => {
  if (!conversation?.members) return;

  try {
    const io = getIO();

    for (const member of conversation.members) {
      for (const socket of io.sockets.sockets.values()) {
        if (socket.rooms.has(`user:${member.userId}`)) {
          try {
            await socket.join(`conversation:${conversation.id}`);
          } catch (err: unknown) {
            console.error("[Socket.io] failed to join room", err);
          }
        }
      }
    }

    for (const member of conversation.members) {
      io.to(`user:${member.userId}`).emit(SOCKET_EVENTS.CONVERSATION_NEW, conversation);
    }
  } catch (err: unknown) {
    console.error("[Socket.io] Failed to apply dynamic room join for new conversation:", err);
  }
};

export const dispatchMessageEvent = (
  action: "NEW" | "UPDATE" | "DELETE",
  conversationId: string,
  message: Message,
  conversationMetadata?: Partial<Conversation> | null
): void => {
  try {
    const io = getIO();
    const eventName =
      action === "NEW" ? SOCKET_EVENTS.MESSAGE_NEW :
      action === "UPDATE" ? SOCKET_EVENTS.MESSAGE_UPDATE :
      SOCKET_EVENTS.MESSAGE_DELETE;

    io.to(`conversation:${conversationId}`).emit(eventName, message);

    if (conversationMetadata) {
      io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.CONVERSATION_UPDATE, {
        conversation: conversationMetadata
      });
    }
  } catch (err: unknown) {
    console.error(`[Socket.io] Failed to dispatch MESSAGE_${action}:`, err);
  }
};

export const dispatchMessageRead = (
  conversationId: string,
  payload: { conversationId: string; userId: string; lastReadMessageId: string }
): void => {
  try {
    const io = getIO();
    io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.MESSAGE_READ, payload);
  } catch (err: unknown) {
    console.error("[Socket.io] Failed to dispatch MESSAGE_READ:", err);
  }
};

export const dispatchUserPresence = (
  action: "ONLINE" | "OFFLINE" | "INITIAL",
  userIdOrIds: string | string[],
  targetSocket?: Socket
): void => {
  try {
    const io = getIO();

    if (action === "INITIAL" && targetSocket) {
      targetSocket.emit(SOCKET_EVENTS.INITIAL_PRESENCE, { userIds: userIdOrIds as string[] });
    } else if (action === "ONLINE") {
      if (targetSocket) {
        targetSocket.broadcast.emit(SOCKET_EVENTS.USER_ONLINE, { userId: userIdOrIds as string });
      } else {
        io.emit(SOCKET_EVENTS.USER_ONLINE, { userId: userIdOrIds as string });
      }
    } else if (action === "OFFLINE") {
      io.emit(SOCKET_EVENTS.USER_OFFLINE, { userId: userIdOrIds as string });
    }
  } catch (err: unknown) {
    console.error(`[Socket.io] Failed to dispatch USER_${action}:`, err);
  }
};

export const dispatchChannelUpdate = (
  workspaceId: string,
  payload: { action: "UPDATED" | "DELETED"; channel: Partial<Conversation> }
): void => {
  try {
    const io = getIO();
    io.to(`workspace:${workspaceId}`).emit(SOCKET_EVENTS.CHANNEL_UPDATE, payload);
  } catch (err: unknown) {
    console.error("[Socket.io] Failed to dispatch CHANNEL_UPDATE:", err);
  }
};

export const dispatchMemberUpdate = (
  workspaceId: string,
  payload: { action: "ROLE_UPDATED"; member: any }
): void => {
  try {
    const io = getIO();
    io.to(`workspace:${workspaceId}`).emit(SOCKET_EVENTS.MEMBER_UPDATE, payload);
  } catch (err: unknown) {
    console.error("[Socket.io] Failed to dispatch MEMBER_UPDATE:", err);
  }
};
