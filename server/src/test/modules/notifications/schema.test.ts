import { describe, it, expect } from "vitest";

const {
  getNotificationsQuerySchema,
  markAsReadParamsSchema,
  pushSubscriptionSchema,
  updatePreferencesSchema,
} = await import("@/modules/notifications/notifications.schema.js");

describe("notifications schemas", () => {
  describe("getNotificationsQuerySchema", () => {
    it("accepts no params with defaults", () => {
      const result = getNotificationsQuerySchema.parse({});
      expect(result.limit).toBeUndefined();
      expect(result.cursor).toBeUndefined();
    });

    it("accepts valid cursor and limit", () => {
      const result = getNotificationsQuerySchema.parse({
        cursor: "abc-123",
        limit: "10",
      });
      expect(result.limit).toBe(10);
    });
  });

  describe("markAsReadParamsSchema", () => {
    it("accepts valid notification id", () => {
      const result = markAsReadParamsSchema.parse({
        id: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440000");
    });

    it("rejects empty id", () => {
      expect(() => markAsReadParamsSchema.parse({ id: "" })).toThrow();
    });
  });

  describe("pushSubscriptionSchema", () => {
    it("accepts valid subscription", () => {
      const result = pushSubscriptionSchema.parse({
        endpoint: "https://push.example.com/abc",
        keys: {
          p256dh: "base64key1",
          auth: "base64key2",
        },
      });
      expect(result.endpoint).toBe("https://push.example.com/abc");
    });

    it("rejects missing endpoint", () => {
      expect(() =>
        pushSubscriptionSchema.parse({
          keys: { p256dh: "key1", auth: "key2" },
        })
      ).toThrow();
    });
  });

  describe("updatePreferencesSchema", () => {
    it("accepts partial preferences", () => {
      const result = updatePreferencesSchema.parse({ pushEnabled: true });
      expect(result.pushEnabled).toBe(true);
    });

    it("strips unknown fields (Zod default)", () => {
      const result = updatePreferencesSchema.parse({
        pushEnabled: true,
        invalidField: "ignored",
      });
      expect(result.pushEnabled).toBe(true);
      expect((result as any).invalidField).toBeUndefined();
    });
  });
});
