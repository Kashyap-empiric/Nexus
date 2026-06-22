import { describe, it, expect, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/constants/queryKeys";
import { handleNotificationNew } from "../../socket/handlers/notification.handlers";
import type { Notification } from "@/modules/notifications/types/notification";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function createNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "notif-1",
    userId: "user-1",
    type: "MEMBER_JOINED",
    title: "New member",
    body: "Someone joined",
    link: null,
    imageUrl: null,
    read: false,
    metadata: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("handleNotificationNew", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
  });

  it("increments the unreadCount in cache", () => {
    queryClient.setQueryData(queryKeys.unreadCount, 5);

    const handler = handleNotificationNew(queryClient);
    handler(createNotification());

    const count = queryClient.getQueryData<number>(queryKeys.unreadCount);
    expect(count).toBe(6);
  });

  it("starts unreadCount from 0 if no previous count", () => {
    const handler = handleNotificationNew(queryClient);
    handler(createNotification());

    const count = queryClient.getQueryData<number>(queryKeys.unreadCount);
    expect(count).toBe(1);
  });

  it("invalidates the notifications query", () => {
    queryClient.setQueryData(queryKeys.notifications, []);

    const handler = handleNotificationNew(queryClient);
    handler(createNotification());

    const state = queryClient.getQueryState(queryKeys.notifications);
    expect(state?.isInvalidated).toBe(true);
  });
});
