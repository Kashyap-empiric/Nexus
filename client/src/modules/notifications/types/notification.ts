export type NotificationType =
  | "INVITE_RECEIVED"
  | "INVITE_ACCEPTED"
  | "MEMBER_JOINED"
  | "CHANNEL_CREATED"
  | "CHANNEL_MEMBER_ADDED"
  | "CHANNEL_MEMBER_REMOVED"
  | "MEMBER_REMOVED"
  | "MESSAGE_REPLIED"
  | "ROLE_CHANGED"
  | "WORKSPACE_DELETED";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  imageUrl: string | null;
  read: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationPreference {
  pushEnabled: boolean;
  dmNotifications: boolean;
  mentionNotifications: boolean;
  channelNotifications: boolean;
}
