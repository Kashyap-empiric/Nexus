import type { Notification } from "@/modules/notifications/types/notification";

export const SOCKET_EVENTS = {
  MESSAGE_NEW: "message:new",
  MESSAGE_READ: "message:read",
  MESSAGE_SEND: "message:send",
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",
  USER_ONLINE: "user:online",
  USER_OFFLINE: "user:offline",
  INITIAL_PRESENCE: "presence:initial",
  CONVERSATION_NEW: "conversation:new",
  MESSAGE_UPDATE: "message:update",
  MESSAGE_DELETE: "message:delete",
  CONVERSATION_UPDATE: "conversation:update",
  WORKSPACE_UPDATE: "workspace:update",
  CHANNEL_UPDATE: "channel:update",
  MEMBER_UPDATE: "member:update",
  NOTIFICATION_NEW: "notification:new",
  NOTIFICATION_UPDATE: "notification:update",
  USER_STATUS_UPDATE: "user:status:update",
  USER_UPDATE: "user:update",
  CHANNEL_MEMBER_ADDED: "channel:member-added",
  CHANNEL_MEMBER_REMOVED: "channel:member-removed",
  MESSAGE_PIN: "message:pin",
  MESSAGE_UNPIN: "message:unpin",
  PRESENCE_UPDATE: "presence:update",
} as const;

export type Visibility = "PUBLIC" | "PRIVATE";
export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";

export interface MessageSendPayload {
  tempId: string;
  conversationId: string;
  content: string;
  replyToId?: string;
  threadRootId?: string;
  isThreadBroadcast?: boolean;
  attachmentIds?: string[];
}

export interface TypingStartClientPayload {
  conversationId: string;
  username: string;
}

export interface TypingStopClientPayload {
  conversationId: string;
}

export interface MessageReadPayload {
  conversationId: string;
  userId: string;
  lastReadMessageId: string;
}

export interface InitialPresencePayload {
  users: { userId: string; status: string }[];
}

export interface UserPresencePayload {
  userId: string;
}

export interface UserStatusUpdatePayload {
  userId: string;
  status: string;
  statusText: string | null;
}

export interface UserUpdatePayload {
  userId: string;
}

export interface ConversationUpdatePayload {
  conversation: {
    id: string;
    name?: string | null;
    updatedAt?: string;
    latestMessageId?: string | null;
    latestMessage?: {
      id: string;
      userId: string;
      content: string;
      deletedAt: string | null;
      createdAt: string;
      user: {
        username: string;
        fullName: string | null;
      };
      attachments?: { id: string; originalName: string; size: number; mimeType: string; extension: string; storagePath: string; }[];
    } | null;
  };
}

export interface ChannelUpdateChannel {
  id: string;
  name?: string;
  visibility?: Visibility;
}

export interface ChannelUpdatePayload {
  action: "UPDATED" | "DELETED";
  channel: {
    id: string;
    name?: string;
    visibility?: string;
  };
}

export interface ChannelMember {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface ChannelMemberAddedPayload {
  workspaceId: string;
  channelId: string;
  addedMembers: ChannelMember[];
}

export interface ChannelMemberRemovedPayload {
  workspaceId: string;
  channelId: string;
  removedUserId: string;
}

export interface MemberUpdateMember {
  userId: string;
  role?: WorkspaceRole;
}

export interface MemberUpdatePayload {
  action: "ROLE_UPDATED" | "REMOVED";
  member: MemberUpdateMember;
}

export interface MessagePinPayload {
  messageId: string;
  conversationId: string;
  action: "pin" | "unpin";
  pinnedBy?: string;
  pinnedByUsername?: string;
}

export type NotificationNewPayload = Notification;
