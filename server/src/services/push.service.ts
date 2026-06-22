import webpush from "web-push";
import { ENV } from "@/config/env.js";
import { prisma } from "@/lib/db.js";
import {
  getPushSubscriptionsByUserId,
  deletePushSubscription,
} from "@/modules/notifications/notifications.repository.js";

export const initPushService = () => {
  if (!ENV.VAPID_PUBLIC_KEY || !ENV.VAPID_PRIVATE_KEY) {
    console.warn("[Push] VAPID keys not configured. Web push is disabled.");
    return;
  }

  webpush.setVapidDetails(
    ENV.VAPID_SUBJECT,
    ENV.VAPID_PUBLIC_KEY,
    ENV.VAPID_PRIVATE_KEY
  );
};

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
}

export const sendPushNotification = async (userId: string, payload: PushPayload, force = false) => {
  try {
    if (!force) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { pushNotificationsEnabled: true }
      });

      if (!user || !user.pushNotificationsEnabled) return;
    }

    const subscriptions = await getPushSubscriptionsByUserId(userId);
    if (!subscriptions || subscriptions.length === 0) return;

    const absoluteUrl = payload.url
      ? payload.url.startsWith("http://") || payload.url.startsWith("https://")
        ? payload.url
        : `${ENV.CLIENT_URL.replace(/\/$/, "")}${payload.url}`
      : undefined;

    const payloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: absoluteUrl,
      tag: payload.tag,
    });

    let expiredCount = 0;
    let errorCount = 0;

    const promises = subscriptions.map(async (sub) => {
      if (!sub.p256dh || !sub.auth) {
        console.warn(`[Push] Skipping subscription with missing keys for endpoint: ${sub.endpoint.substring(0, 50)}...`);
        await deletePushSubscription(sub.endpoint);
        return;
      }

      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payloadString, {
          TTL: 1800,
          urgency: "high",
        });
      } catch (err: unknown) {
        const error = err as { statusCode?: number };
        if (error.statusCode === 410 || error.statusCode === 404) {
          await deletePushSubscription(sub.endpoint);
          expiredCount++;
        } else {
          errorCount++;
          console.error(`[Push] Send failed for endpoint: ${sub.endpoint.substring(0, 50)}...`, err);
        }
      }
    });

    await Promise.all(promises);

    if (expiredCount > 0 || errorCount > 0) {
      console.warn(`[Push] Delivered to user ${userId}: ${subscriptions.length - expiredCount - errorCount}/${subscriptions.length} success, ${expiredCount} expired, ${errorCount} errors`);
    }
  } catch (error) {
    console.error("[Push] Failed to send notifications:", error);
  }
};
