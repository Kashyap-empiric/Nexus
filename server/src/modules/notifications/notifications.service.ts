import { prisma } from "@/lib/db.js";
import * as notificationsRepo from "./notifications.repository.js";
import { notificationQueue } from "@/jobs/queues.js";
import type { CreateNotificationInput, PaginationParams } from "./notifications.types.js";
import { getIO } from "@/socket/socket.js";
import { SOCKET_EVENTS } from "@/shared/socket-events.js";
import type { NotificationType } from "@prisma/client";

enum NotificationCategory {
  INVITES = "INVITES",
  REPLIES = "REPLIES",
  MENTIONS = "MENTIONS",
  WORKSPACE_ACTIVITY = "WORKSPACE_ACTIVITY",
  SYSTEM_CRITICAL = "SYSTEM_CRITICAL",
}

const NOTIFICATION_CATEGORY_MAP: Record<NotificationType, NotificationCategory> = {
  INVITE_RECEIVED: NotificationCategory.INVITES,
  INVITE_ACCEPTED: NotificationCategory.INVITES,
  INVITE_DECLINED: NotificationCategory.INVITES,

  MESSAGE_REPLIED: NotificationCategory.REPLIES,
  THREAD_REPLY: NotificationCategory.REPLIES,

  MENTIONED_IN_MESSAGE: NotificationCategory.MENTIONS,

  MEMBER_JOINED: NotificationCategory.WORKSPACE_ACTIVITY,
  ROLE_CHANGED: NotificationCategory.WORKSPACE_ACTIVITY,
  CHANNEL_CREATED: NotificationCategory.WORKSPACE_ACTIVITY,
  CHANNEL_MEMBER_ADDED: NotificationCategory.WORKSPACE_ACTIVITY,

  WORKSPACE_DELETED: NotificationCategory.SYSTEM_CRITICAL,
  MEMBER_REMOVED: NotificationCategory.SYSTEM_CRITICAL,
  CHANNEL_MEMBER_REMOVED: NotificationCategory.SYSTEM_CRITICAL,
};

const CATEGORY_PREFERENCE_MAP = {
  [NotificationCategory.INVITES]: "inviteNotifications",
  [NotificationCategory.REPLIES]: "replyNotifications",
  [NotificationCategory.MENTIONS]: "mentionNotifications",
  [NotificationCategory.WORKSPACE_ACTIVITY]: "workspaceActivityNotifications",
} as const;

type UserPreferences = {
  inviteNotifications: boolean;
  replyNotifications: boolean;
  mentionNotifications: boolean;
  workspaceActivityNotifications: boolean;
};

const shouldReceiveNotification = (
  userPrefs: UserPreferences,
  type: NotificationType
): boolean => {
  const category = NOTIFICATION_CATEGORY_MAP[type];

  if (category === NotificationCategory.SYSTEM_CRITICAL) {
    return true;
  }

  const prefKey = CATEGORY_PREFERENCE_MAP[category];
  
  if (!prefKey) {
    return true;
  }

  return userPrefs[prefKey];
};



export const getUserNotifications = async (
  userId: string,
  params: PaginationParams = {}
) => {
  const { cursor, limit = 21, type } = params;
  return notificationsRepo.findByUserId(userId, cursor, limit, type);
};


export const getUnreadCount = async (
  userId: string
): Promise<{ count: number }> => {
  const count = await notificationsRepo.countUnreadByUserId(userId);
  return { count };
};


export const markAsRead = async (id: string, userId: string) => {
  return notificationsRepo.markAsRead(id, userId);
};


export const markAllAsRead = async (userId: string) => {
  return notificationsRepo.markAllAsRead(userId);
};


export const createAndDispatch = async (input: CreateNotificationInput) => {
  const type = input.type as NotificationType;
  
  const category = NOTIFICATION_CATEGORY_MAP[type];
  const isCritical = category === NotificationCategory.SYSTEM_CRITICAL;

  const prefs = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      inviteNotifications: true,
      replyNotifications: true,
      mentionNotifications: true,
      workspaceActivityNotifications: true,
    },
  });

  if (!prefs) {
    console.log(`[Notification Dispatch] User ${input.userId} not found. Skipping.`);
    return null;
  }

  if (!isCritical && !shouldReceiveNotification(prefs, type)) {
    console.log(`[Notification Dispatch] Skipping notification of type '${type}' for user ${input.userId} due to preferences.`);
    return null;
  }

  console.log(`[Notification Dispatch] Creating notification of type '${type}' for user ${input.userId}...`);
  const notification = await notificationsRepo.create({
    userId: input.userId,
    type: type,
    title: input.title,
    body: input.body,
    link: input.link,
    imageUrl: input.imageUrl,
    metadata: (input.metadata ?? undefined) as Record<string, unknown> | undefined,
  });
  console.log(`[Notification Dispatch] Notification created in DB with ID: ${notification.id}`);

  try {
    console.log(`[Notification Dispatch] Emitting socket event to room 'user:${input.userId}'...`);
    const io = getIO();
    io.to(`user:${input.userId}`).emit(SOCKET_EVENTS.NOTIFICATION_NEW, notification);
    console.log(`[Notification Dispatch] Socket event emitted.`);
  } catch (err) {
    console.error("[Notification Dispatch] Failed to emit notification:new socket event:", err);
  }

  if (notificationQueue) {
    const pushBody = notification.body
      ? `${notification.title}: ${notification.body}`
      : notification.title;
    notificationQueue.add("push-to-user", {
      userId: input.userId,
      payload: {
        title: "Nexus",
        body: pushBody,
        url: notification.link || undefined,
        tag: notification.id,
      },
      force: isCritical,
    }).catch((err: unknown) => {
      console.error("[Notification Dispatch] Failed to enqueue push-to-user:", err);
    });
  }

  return notification;
};
