import { sendPushNotification } from "@/services/push.service.js";
import * as notificationsRepo from "./notifications.repository.js";
import type { CreateNotificationInput, PaginationParams } from "./notifications.types.js";
import { getIO } from "@/socket/socket.js";
import { SOCKET_EVENTS } from "@/shared/socket-events.js";
import type { NotificationType } from "@prisma/client";

/**
 * Fetch paginated notifications for a user.
 * Returns newest-first with cursor-based pagination.
 */
export const getUserNotifications = async (
  userId: string,
  params: PaginationParams = {}
) => {
  const { cursor, limit = 21 } = params;
  return notificationsRepo.findByUserId(userId, cursor, limit);
};

/**
 * Get the count of unread notifications for a user.
 * Used by the bell badge on the client.
 */
export const getUnreadCount = async (
  userId: string
): Promise<{ count: number }> => {
  const count = await notificationsRepo.countUnreadByUserId(userId);
  return { count };
};

/**
 * Mark a single notification as read.
 */
export const markAsRead = async (id: string, userId: string) => {
  return notificationsRepo.markAsRead(id, userId);
};

/**
 * Mark all notifications as read for a user.
 */
export const markAllAsRead = async (userId: string) => {
  return notificationsRepo.markAllAsRead(userId);
};

/**
 * Create a notification and emit it via socket to the user's room.
 * This is the central function used by all notification-producing flows.
 */
export const createAndDispatch = async (input: CreateNotificationInput) => {
  console.log(`[Notification Dispatch] Creating notification of type '${input.type}' for user ${input.userId}...`);
  const notification = await notificationsRepo.create({
    userId: input.userId,
    type: input.type as NotificationType,
    title: input.title,
    body: input.body,
    link: input.link,
    imageUrl: input.imageUrl,
    metadata: (input.metadata as any) ?? undefined,
  });
  console.log(`[Notification Dispatch] Notification created in DB with ID: ${notification.id}`);

  // Emit socket event to the user's personal room
  try {
    console.log(`[Notification Dispatch] Emitting socket event to room 'user:${input.userId}'...`);
    const io = getIO();
    io.to(`user:${input.userId}`).emit(SOCKET_EVENTS.NOTIFICATION_NEW, notification);
    console.log(`[Notification Dispatch] Socket event emitted.`);
  } catch (err) {
    console.error("[Notification Dispatch] Failed to emit notification:new socket event:", err);
  }

  // Push delivery for offline/background
  console.log(`[Notification Dispatch] Triggering Web Push delivery for user ${input.userId}...`);
  sendPushNotification(input.userId, {
    title: notification.title,
    body: notification.body || undefined,
    url: notification.link || undefined,
    tag: notification.id,
  }).catch(err => console.error("[Notification Dispatch] Push send failed:", err));

  return notification;
};
