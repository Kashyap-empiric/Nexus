import { api } from "@/shared/lib/api";
import { API_ROUTES } from "@/config/url";
import type { Notification, NotificationPreference } from "../types/notification";

export const getNotifications = async (cursor?: string): Promise<{ data: Notification[]; nextCursor: string | null }> => {
  const url = cursor ? `${API_ROUTES.NOTIFICATIONS.BASE}?cursor=${cursor}` : API_ROUTES.NOTIFICATIONS.BASE;
  const response = await api.get(url);
  return response.data;
};

export const getUnreadCount = async (): Promise<{ count: number }> => {
  const response = await api.get(API_ROUTES.NOTIFICATIONS.UNREAD_COUNT);
  return response.data;
};

export const markAsRead = async (id: string): Promise<void> => {
  await api.patch(API_ROUTES.NOTIFICATIONS.MARK_READ(id));
};

export const markAllAsRead = async (): Promise<void> => {
  await api.patch(API_ROUTES.NOTIFICATIONS.MARK_ALL_READ);
};

export const getPreferences = async (): Promise<NotificationPreference> => {
  const response = await api.get(API_ROUTES.NOTIFICATIONS.PREFERENCES);
  return response.data;
};

export const updatePreferences = async (prefs: Partial<NotificationPreference>): Promise<NotificationPreference> => {
  const response = await api.put(API_ROUTES.NOTIFICATIONS.PREFERENCES, prefs);
  return response.data;
};

export const subscribePush = async (endpoint: string, p256dh: string, auth: string): Promise<void> => {
  await api.post(API_ROUTES.NOTIFICATIONS.PUSH_SUBSCRIBE, { endpoint, p256dh, auth });
};

export const unsubscribePush = async (subscriptionId: string): Promise<void> => {
  await api.delete(API_ROUTES.NOTIFICATIONS.PUSH_UNSUBSCRIBE(subscriptionId));
};
