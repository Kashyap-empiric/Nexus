import { getIO } from "./socket.js";
import { SOCKET_EVENTS } from "../shared/socket-events.js";
import { prisma } from "../lib/db.js";

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
      try {
        const sockets = await io.in(`user:${member.userId}`).fetchSockets();
        for (const socket of sockets) {
          await socket.join(`conversation:${conversation.id}`);
        }
      } catch (err: unknown) {
        console.error("[Socket.io] failed to join room", err);
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

export const dispatchNotification = (userId: string, notification: any) => {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit(SOCKET_EVENTS.NOTIFICATION_NEW, notification);
  } catch (error) {
    console.error("Error dispatching notification:", error);
  }
};

export const dispatchUserStatusUpdate = async (userId: string, status: string, statusText: string | null) => {
  try {
    const io = getIO();
    
    // Broadcast to the user's own sockets
    io.to(`user:${userId}`).emit(SOCKET_EVENTS.USER_STATUS_UPDATE, { userId, status, statusText });

    // Broadcast to all workspaces the user is a member of
    const workspaces = await prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true }
    });

    for (const w of workspaces) {
      io.to(`workspace:${w.workspaceId}`).emit(SOCKET_EVENTS.USER_STATUS_UPDATE, { userId, status, statusText });
    }
    
    // Note: DMs are technically conversations. If we want we could emit to conversations as well,
    // but for now workspace scoping covers 99% of chat scenarios in Nexus MVP.
  } catch (error) {
    console.error("Error dispatching status update:", error);
  }
};

export const dispatchUserProfileUpdate = async (userId: string) => {
  try {
    const io = getIO();
    
    // Broadcast to the user's own sockets
    io.to(`user:${userId}`).emit(SOCKET_EVENTS.USER_UPDATE, { userId });

    // Broadcast to all workspaces the user is a member of
    const workspaces = await prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true }
    });

    for (const w of workspaces) {
      io.to(`workspace:${w.workspaceId}`).emit(SOCKET_EVENTS.USER_UPDATE, { userId });
    }
    
    // Note: Can also emit to conversations if necessary, but this is consistent with status updates
  } catch (error) {
    console.error("Error dispatching profile update:", error);
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
      targetSocket.emit(SOCKET_EVENTS.INITIAL_PRESENCE, { users: userIdOrIds });
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

export const dispatchPinEvent = (
  action: "pin" | "unpin",
  conversationId: string,
  payload: { messageId: string; pinnedBy?: string; pinnedByUsername?: string }
): void => {
  try {
    const io = getIO();
    const eventName = action === "pin" ? SOCKET_EVENTS.MESSAGE_PIN : SOCKET_EVENTS.MESSAGE_UNPIN;
    io.to(`conversation:${conversationId}`).emit(eventName, { ...payload, conversationId, action });
  } catch (err: unknown) {
    console.error("[Socket.io] Failed to dispatch pin event:", err);
  }
};

export const dispatchChannelMemberUpdate = async (
  workspaceId: string,
  channelId: string,
  action: "ADDED" | "REMOVED",
  payload: { addedMembers?: { id: string; username: string; fullName: string | null; avatarUrl: string | null }[]; removedUserId?: string }
): Promise<void> => {
  try {
    const io = getIO();

    if (action === "ADDED" && payload.addedMembers) {
      for (const member of payload.addedMembers) {
        try {
          const sockets = await io.in(`user:${member.id}`).fetchSockets();
          for (const socket of sockets) {
            await socket.join(`conversation:${channelId}`);
          }
        } catch (err: unknown) {
          console.error("[Socket.io] failed to join room for channel member", err);
        }
      }
      io.to(`conversation:${channelId}`).emit(SOCKET_EVENTS.CHANNEL_MEMBER_ADDED, {
        workspaceId,
        channelId,
        addedMembers: payload.addedMembers,
      });
    } else if (action === "REMOVED" && payload.removedUserId) {
      io.to(`conversation:${channelId}`).emit(SOCKET_EVENTS.CHANNEL_MEMBER_REMOVED, {
        workspaceId,
        channelId,
        removedUserId: payload.removedUserId,
      });
    }
  } catch (err: unknown) {
    console.error("[Socket.io] Failed to dispatch CHANNEL_MEMBER_UPDATE:", err);
  }
};

export const dispatchMemberUpdate = (
  workspaceId: string,
  payload: { action: "ROLE_UPDATED" | "REMOVED"; member: any }
): void => {
  try {
    const io = getIO();
    io.to(`workspace:${workspaceId}`).emit(SOCKET_EVENTS.MEMBER_UPDATE, payload);

    // For REMOVED action, also notify the removed user directly
    if (payload.action === "REMOVED" && payload.member?.userId) {
      io.to(`user:${payload.member.userId}`).emit(SOCKET_EVENTS.MEMBER_UPDATE, payload);
    }
  } catch (err: unknown) {
    console.error("[Socket.io] Failed to dispatch MEMBER_UPDATE:", err);
  }
};

