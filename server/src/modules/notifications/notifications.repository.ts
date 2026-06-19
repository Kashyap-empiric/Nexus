import { prisma } from "@/lib/db.js";
import type { Prisma, NotificationType } from "@prisma/client";



export const findByUserId = async (
  userId: string,
  cursor?: string,
  limit: number = 21,
  type?: string 
): Promise<{ data: any[]; nextCursor: string | null }> => {
  const where: Prisma.NotificationWhereInput = { userId };

  if (type) {
    const types = type.split(",").filter(Boolean);
    where.type = { in: types as NotificationType[] };
  }

  const items = await prisma.notification.findMany({
    where,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
  });

  const hasNextPage = items.length > limit;
  if (hasNextPage) items.pop();

  const nextCursor = hasNextPage ? items[items.length - 1].id : null;

  return { data: items, nextCursor };
};

export const countUnreadByUserId = async (userId: string): Promise<number> => {
  return prisma.notification.count({
    where: { userId, read: false },
  });
};


export const create = async (data: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}): Promise<any> => {
  return prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      link: data.link,
      imageUrl: data.imageUrl,
      metadata: data.metadata as any,
    },
  });
};

export const markAsRead = async (
  id: string,
  userId: string
): Promise<{ count: number }> => {
  const result = await prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
  return { count: result.count };
};

export const markAllAsRead = async (
  userId: string
): Promise<{ count: number }> => {
  const result = await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  return { count: result.count };
};


export const savePushSubscription = async (
  userId: string,
  endpoint: string,
  p256dh: string,
  auth: string,
  userAgent?: string
) => {
  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: { not: userId } },
  });

  return prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh, auth, userAgent },
    create: { userId, endpoint, p256dh, auth, userAgent },
  });
};

export const getPushSubscriptionsByUserId = async (userId: string) => {
  return prisma.pushSubscription.findMany({
    where: { userId },
  });
};

export const deletePushSubscription = async (endpoint: string) => {
  return prisma.pushSubscription.deleteMany({
    where: { endpoint },
  });
};
