import { describe, it, expect } from "vitest";

const {
  createConversationSchema,
  markReadSchema,
  conversationParamsSchema,
} = await import("@/modules/conversations/conversations.schema.js");

describe("conversations schemas", () => {
  describe("createConversationSchema", () => {
    it("accepts valid target user ID", () => {
      const result = createConversationSchema.parse({
        targetUserId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.targetUserId).toBe("550e8400-e29b-41d4-a716-446655440000");
    });

    it("rejects missing targetUserId", () => {
      expect(() => createConversationSchema.parse({})).toThrow();
    });

    it("rejects non-UUID targetUserId", () => {
      expect(() => createConversationSchema.parse({ targetUserId: "abc" })).toThrow();
    });
  });

  describe("markReadSchema", () => {
    it("accepts valid messageId", () => {
      const result = markReadSchema.parse({
        messageId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.messageId).toBe("550e8400-e29b-41d4-a716-446655440000");
    });

    it("rejects missing messageId", () => {
      expect(() => markReadSchema.parse({})).toThrow();
    });
  });

  describe("conversationParamsSchema", () => {
    it("accepts valid UUID id", () => {
      const result = conversationParamsSchema.parse({
        id: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440000");
    });
  });
});
