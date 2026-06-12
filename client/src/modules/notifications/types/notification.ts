export type NotificationType =
  | "MESSAGE"
  | "INVITE_RECEIVED"
  | "INVITE_ACCEPTED"
  | "MEMBER_JOINED"
  | "CHANNEL_CREATED";

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
