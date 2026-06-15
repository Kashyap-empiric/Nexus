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
    console.log(`[Push Backend] Attempting to send push notification to user ${userId}`);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushNotificationsEnabled: true }
    });
    
    if (!user) {
      console.log(`[Push Backend] User ${userId} not found, skipping push.`);
      return;
    }
    if (!user.pushNotificationsEnabled) {
      console.log(`[Push Backend] User ${userId} has push notifications disabled, skipping.`);
      return;
    }

    const subscriptions = await getPushSubscriptionsByUserId(userId);
    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[Push Backend] No active push subscriptions found for user ${userId}.`);
      return;
    }

    console.log(`[Push Backend] Found ${subscriptions.length} subscription(s) for user ${userId}.`);

    // Normalize relative URLs to absolute so the service worker can match them
    // against client.url (which is always an absolute URL like https://app.com/path)
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

    const promises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        console.log(`[Push Backend] Sending to endpoint: ${pushSubscription.endpoint.substring(0, 50)}...`);
        await webpush.sendNotification(pushSubscription, payloadString);
        console.log(`[Push Backend] Successfully sent push to endpoint: ${pushSubscription.endpoint.substring(0, 50)}...`);
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`[Push Backend] Subscription expired or invalid (Status ${error.statusCode}). Deleting endpoint: ${sub.endpoint}`);
          await deletePushSubscription(sub.endpoint);
        } else {
          console.error(`[Push Backend] Error sending push to endpoint ${sub.endpoint}:`, error);
        }
      }
    });

    await Promise.all(promises);
    console.log(`[Push Backend] Finished processing push notifications for user ${userId}.`);
  } catch (error) {
    console.error("[Push Backend] Failed to send push notifications:", error);
  }
};
