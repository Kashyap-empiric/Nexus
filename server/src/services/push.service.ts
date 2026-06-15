import webpush from "web-push";
import { ENV } from "@/config/env.js";
import { prisma } from "@/lib/db.js";
import {
  getPushSubscriptionsByUserId,
  deletePushSubscription,
} from "@/modules/notifications/notifications.repository.js";

// Initialize web-push with our VAPID keys
export const initPushService = () => {
  if (!ENV.VAPID_PUBLIC_KEY || !ENV.VAPID_PRIVATE_KEY) {
    console.warn("[Push Service] VAPID keys not configured. Web push is disabled.");
    return;
  }
  
  webpush.setVapidDetails(
    ENV.VAPID_SUBJECT,
    ENV.VAPID_PUBLIC_KEY,
    ENV.VAPID_PRIVATE_KEY
  );
  
  console.log("[Push Service] Initialized");
};

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
}

export const sendPushNotification = async (userId: string, payload: PushPayload) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushNotificationsEnabled: true }
    });
    
    if (!user || !user.pushNotificationsEnabled) return;

    const subscriptions = await getPushSubscriptionsByUserId(userId);
    if (!subscriptions || subscriptions.length === 0) return;

    const payloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url,
      tag: payload.tag,
    });

    const promises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payloadString);
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`[Push Service] Subscription expired. Deleting endpoint: ${sub.endpoint}`);
          await deletePushSubscription(sub.endpoint);
        } else {
          console.error("[Push Service] Error sending push:", error);
        }
      }
    });

    await Promise.all(promises);
  } catch (error) {
    console.error("[Push Service] Failed to send push notifications:", error);
  }
};
