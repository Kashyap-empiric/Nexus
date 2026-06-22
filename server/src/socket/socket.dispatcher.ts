import { getIO } from "./socket.js";
import { SOCKET_EVENTS } from "../shared/socket-events.js";
import { prisma } from "../lib/db.js";
import type { NotificationDTO } from "../modules/notifications/notifications.types.js";

import type { Socket } from "socket.io";
import type { Conversation, Message, ConversationMember } from "@prisma/client";
import type { InitialPresencePayload, MemberUpdatePayload, ChannelMember } from "../shared/socket-events.js";

export type ConversationWithMembers = Conversation & {
  members: ConversationMember[];
};

export const dispatchConversationNew = async (conversation: ConversationWithMembers): Promise<void> => {
  if (!conversation?.members) return;

  try {
    const io = getIO();
    const memberIds = conversation.members.map(m => m.userId);

    for (const userId of memberIds) {
      try {
        io.in(`user:${userId}`).socketsJoin(`conversation:${conversation.id}`);
      } catch (err: unknown) {
        console.error("[Socket.io] failed to join room", err);
      }
    }

    for (const userId of memberIds) {
      io.to(`user:${userId}`).emit(SOCKET_EVENTS.CONVERSATION_NEW, conversation);
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

export const dispatchUserStatusUpdate = async (userId: string, status: string, statusText: string | null) => {
  try {
    const io = getIO();
    
    io.to(`user:${userId}`).emit(SOCKET_EVENTS.USER_STATUS_UPDATE, { userId, status, statusText });

    const workspaces = await prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true }
    });

    for (const w of workspaces) {
      io.to(`workspace:${w.workspaceId}`).emit(SOCKET_EVENTS.USER_STATUS_UPDATE, { userId, status, statusText });
    }
    
  } catch (error) {
    console.error("Error dispatching status update:", error);
  }
};

export const dispatchUserProfileUpdate = async (userId: string) => {
  try {
    const io = getIO();
    
    io.to(`user:${userId}`).emit(SOCKET_EVENTS.USER_UPDATE, { userId });

    const workspaces = await prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true }
    });

    for (const w of workspaces) {
      io.to(`workspace:${w.workspaceId}`).emit(SOCKET_EVENTS.USER_UPDATE, { userId });
    }
    
  } catch (error) {
    console.error("Error dispatching profile update:", error);
  }
};

export function dispatchUserPresence(
  action: "ONLINE" | "OFFLINE",
  userId: string,
  targetSocket?: Socket
): void;
export function dispatchUserPresence(
  action: "INITIAL",
  payload: InitialPresencePayload,
  targetSocket: Socket
): void;
export function dispatchUserPresence(
  action: "ONLINE" | "OFFLINE" | "INITIAL",
  userIdOrPayload: string | InitialPresencePayload,
  targetSocket?: Socket
): void {
  try {
    const io = getIO();

    if (action === "INITIAL" && targetSocket) {
      const payload = userIdOrPayload as InitialPresencePayload;
      targetSocket.emit(SOCKET_EVENTS.INITIAL_PRESENCE, payload);
    } else if (action === "ONLINE") {
      const userId = userIdOrPayload as string;
      if (targetSocket) {
        targetSocket.broadcast.emit(SOCKET_EVENTS.USER_ONLINE, { userId });
      } else {
        io.emit(SOCKET_EVENTS.USER_ONLINE, { userId });
      }
    } else if (action === "OFFLINE") {
      const userId = userIdOrPayload as string;
      io.emit(SOCKET_EVENTS.USER_OFFLINE, { userId });
    }
  } catch (err: unknown) {
    console.error(`[Socket.io] Failed to dispatch USER_${action}:`, err);
  }
};

export const dispatchWorkspaceUpdate = (
  workspaceId: string,
  payload: { action: "UPDATED"; workspace: Partial<Conversation> } | { action: "DELETED"; workspace: { id: string; name: string }; memberUserIds?: string[] }
): void => {
  try {
    const io = getIO();
    io.to(`workspace:${workspaceId}`).emit(SOCKET_EVENTS.WORKSPACE_UPDATE, payload);

    if (payload.action === "DELETED" && payload.memberUserIds) {
      for (const userId of payload.memberUserIds) {
        io.to(`user:${userId}`).emit(SOCKET_EVENTS.WORKSPACE_UPDATE, payload);
      }
    }
  } catch (err: unknown) {
    console.error("[Socket.io] Failed to dispatch WORKSPACE_UPDATE:", err);
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
          io.in(`user:${member.id}`).socketsJoin(`conversation:${channelId}`);
        } catch (err: unknown) {
          console.error("[Socket.io] failed to join room for channel member", err);
        }
      }
      io.to(`conversation:${channelId}`).emit(SOCKET_EVENTS.CHANNEL_MEMBER_ADDED, {
        workspaceId,
        channelId,
        addedMembers: payload.addedMembers,
      });
      
      for (const member of payload.addedMembers) {
        io.to(`user:${member.id}`).emit(SOCKET_EVENTS.CHANNEL_MEMBER_ADDED, {
          workspaceId,
          channelId,
          addedMembers: payload.addedMembers,
        });
      }
    } else if (action === "REMOVED" && payload.removedUserId) {
      io.to(`conversation:${channelId}`).emit(SOCKET_EVENTS.CHANNEL_MEMBER_REMOVED, {
        workspaceId,
        channelId,
        removedUserId: payload.removedUserId,
      });

      io.to(`user:${payload.removedUserId}`).emit(SOCKET_EVENTS.CHANNEL_MEMBER_REMOVED, {
        workspaceId,
        channelId,
        removedUserId: payload.removedUserId,
      });

      try {
        io.in(`user:${payload.removedUserId}`).socketsLeave(`conversation:${channelId}`);
      } catch (err: unknown) {
        console.error("[Socket.io] failed to leave room for removed channel member", err);
      }
    }
  } catch (err: unknown) {
    console.error("[Socket.io] Failed to dispatch CHANNEL_MEMBER_UPDATE:", err);
  }
};

export const dispatchMemberUpdate = (
  workspaceId: string,
  payload: MemberUpdatePayload
): void => {
  try {
    const io = getIO();
    io.to(`workspace:${workspaceId}`).emit(SOCKET_EVENTS.MEMBER_UPDATE, payload);

    if (payload.action === "REMOVED" && payload.member?.userId) {
      io.to(`user:${payload.member.userId}`).emit(SOCKET_EVENTS.MEMBER_UPDATE, payload);
    }

    if (payload.action === "ADDED" && payload.member?.userId) {
      io.to(`user:${payload.member.userId}`).emit(SOCKET_EVENTS.MEMBER_UPDATE, payload);
    }
  } catch (err: unknown) {
    console.error("[Socket.io] Failed to dispatch MEMBER_UPDATE:", err);
  }
};

export const dispatchNotificationUpdate = (
  userId: string,
  notification: NotificationDTO
): void => {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit(SOCKET_EVENTS.NOTIFICATION_UPDATE, notification);
  } catch (err: unknown) {
    console.error("[Socket.io] Failed to dispatch NOTIFICATION_UPDATE:", err);
  }
};

