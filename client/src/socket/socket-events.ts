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
} as const;

export interface MessageReadPayload {
  conversationId: string;
  userId: string;
  lastReadMessageId: string;
}

export interface InitialPresencePayload {
  userIds: string[];
}
