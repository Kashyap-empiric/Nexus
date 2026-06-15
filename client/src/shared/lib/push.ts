import { subscribePush as apiSubscribePush, unsubscribePush as apiUnsubscribePush } from "@/modules/notifications/api/notifications.api";

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;

  try {
    console.log("[Push Frontend] Explicitly registering service worker...");
    await navigator.serviceWorker.register("/sw.js");

    const registration = await navigator.serviceWorker.ready;
    if (!registration.pushManager) {
      console.warn("[Push Frontend] pushManager not available.");
      return null;
    }

    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      console.log("[Push Frontend] Found existing push subscription.");
      const subJSON = existingSub.toJSON();
      if (subJSON.endpoint && subJSON.keys?.p256dh && subJSON.keys?.auth) {
        console.log("[Push Frontend] Syncing existing subscription to backend...");
        await apiSubscribePush(subJSON.endpoint, subJSON.keys.p256dh, subJSON.keys.auth);
      }
      return existingSub;
    }

    if (!publicVapidKey) {
      console.warn("VAPID public key is not configured.");
      return null;
    }

    console.log("[Push Frontend] Requesting new push subscription from browser...");
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
    });

    console.log("[Push Frontend] New subscription created. Sending to backend...");
    const subJSON = subscription.toJSON();
    if (subJSON.endpoint && subJSON.keys?.p256dh && subJSON.keys?.auth) {
      await apiSubscribePush(subJSON.endpoint, subJSON.keys.p256dh, subJSON.keys.auth);
      console.log("[Push Frontend] Successfully synced new subscription to backend.");
    }

    return subscription;
  } catch (error) {
    console.error("[Push Frontend] Failed to subscribe to push notifications:", error);
    return null;
  }
}

export async function unsubscribeFromPush() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.pushManager) {
      console.warn("[Push Frontend] pushManager not available during unsubscribe.");
      return;
    }

    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      console.log("[Push Frontend] Unsubscribing from push via backend...");
      await apiUnsubscribePush(subscription.endpoint);
      console.log("[Push Frontend] Unsubscribing from push via browser...");
      await subscription.unsubscribe();
      console.log("[Push Frontend] Successfully unsubscribed.");
    } else {
      console.log("[Push Frontend] No active subscription found to unsubscribe.");
    }
  } catch (error) {
    console.error("[Push Frontend] Failed to unsubscribe from push notifications:", error);
  }
}
