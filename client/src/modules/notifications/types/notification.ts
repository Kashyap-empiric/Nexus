export type NotificationType =
  | "INVITE_RECEIVED"
  | "INVITE_ACCEPTED"
  | "MEMBER_JOINED"
  | "CHANNEL_CREATED"
  | "MEMBER_REMOVED"
  | "MESSAGE_REPLIED"
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
