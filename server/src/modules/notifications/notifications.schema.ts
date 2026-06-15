import { z } from "zod";

export const getNotificationsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
});

export const markAsReadParamsSchema = z.object({
  id: z.string().min(1, "Notification ID is required"),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  })
});

export const unsubscribePushSchema = z.object({
  endpoint: z.string().url()
});
