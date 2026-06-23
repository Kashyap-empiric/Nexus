import webpush from "web-push";
import { ENV } from "@/config/env.js";

export const initPushService = () => {
  if (!ENV.VAPID_PUBLIC_KEY || !ENV.VAPID_PRIVATE_KEY) {
    console.warn("[Push] VAPID keys not configured. Web push is disabled.");
    return;
  }

  webpush.setVapidDetails(
    ENV.VAPID_SUBJECT,
    ENV.VAPID_PUBLIC_KEY,
    ENV.VAPID_PRIVATE_KEY,
  );
};
