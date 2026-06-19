import { describe, it, expect } from "vitest";

const {
  getMessagesQuerySchema,
  createMessageBodySchema,
  updateMessageBodySchema,
  searchMessagesQuerySchema,
  messageParamsSchema,
  messageIdParamsSchema,
  pinsParamsSchema,
  pinsIdParamsSchema,
} = await import("@/modules/messages/messages.schema.js");

describe("messages schemas", () => {
  describe("getMessagesQuerySchema", () => {
    it("accepts no params and uses defaults", () => {
      const result = getMessagesQuerySchema.parse({});
      expect(result.limit).toBe(50);
      expect(result.cursor).toBeUndefined();
    });

    it("accepts valid cursor and limit", () => {
      const result = getMessagesQuerySchema.parse({
        cursor: "550e8400-e29b-41d4-a716-446655440000",
        limit: "25",
      });
      expect(result.cursor).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(result.limit).toBe(25);
    });

    it("rejects limit over 100", () => {
      expect(() => getMessagesQuerySchema.parse({ limit: "200" })).toThrow();
    });

    it("rejects limit below 1", () => {
      expect(() => getMessagesQuerySchema.parse({ limit: "0" })).toThrow();
    });

    it("rejects non-numeric limit", () => {
      expect(() => getMessagesQuerySchema.parse({ limit: "abc" })).toThrow();
    });
  });

  describe("createMessageBodySchema", () => {
    it("accepts valid message", () => {
      const result = createMessageBodySchema.parse({ content: "Hello world" });
      expect(result.content).toBe("Hello world");
      expect(result.replyToId).toBeUndefined();
    });

    it("accepts message with replyToId", () => {
      const result = createMessageBodySchema.parse({
        content: "A reply",
        replyToId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.replyToId).toBe("550e8400-e29b-41d4-a716-446655440000");
    });

    it("trims whitespace from content", () => {
      const result = createMessageBodySchema.parse({ content: "   hi   " });
      expect(result.content).toBe("hi");
    });

    it("rejects empty content after trim", () => {
      expect(() => createMessageBodySchema.parse({ content: "   " })).toThrow();
    });

    it("rejects content over 2000 chars", () => {
      expect(() => createMessageBodySchema.parse({ content: "x".repeat(2001) })).toThrow();
    });

    it("accepts content at exactly 2000 chars", () => {
      const result = createMessageBodySchema.parse({ content: "x".repeat(2000) });
      expect(result.content).toHaveLength(2000);
    });

    it("rejects non-string content", () => {
      expect(() => createMessageBodySchema.parse({ content: 123 })).toThrow();
    });

    it("rejects invalid replyToId", () => {
      expect(() =>
        createMessageBodySchema.parse({ content: "hi", replyToId: "not-a-uuid" })
      ).toThrow();
    });
  });

  describe("updateMessageBodySchema", () => {
    it("accepts valid update", () => {
      const result = updateMessageBodySchema.parse({ content: "Updated content" });
      expect(result.content).toBe("Updated content");
    });

    it("rejects empty update", () => {
      expect(() => updateMessageBodySchema.parse({ content: "" })).toThrow();
    });
  });

  describe("searchMessagesQuerySchema", () => {
    it("accepts valid search query", () => {
      const result = searchMessagesQuerySchema.parse({ q: "hello" });
      expect(result.q).toBe("hello");
      expect(result.limit).toBe(10);
    });

    it("rejects empty search query", () => {
      expect(() => searchMessagesQuerySchema.parse({ q: "" })).toThrow();
    });

    it("rejects query over 200 chars", () => {
      expect(() => searchMessagesQuerySchema.parse({ q: "x".repeat(201) })).toThrow();
    });

    it("rejects limit over 50", () => {
      expect(() => searchMessagesQuerySchema.parse({ q: "test", limit: "100" })).toThrow();
    });
  });

  describe("messageParamsSchema", () => {
    it("accepts valid UUID conversationId", () => {
      const result = messageParamsSchema.parse({
        conversationId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.conversationId).toBe("550e8400-e29b-41d4-a716-446655440000");
    });

    it("rejects non-UUID conversationId", () => {
      expect(() => messageParamsSchema.parse({ conversationId: "123" })).toThrow();
    });
  });

  describe("messageIdParamsSchema", () => {
    it("accepts valid UUIDs for both params", () => {
      const result = messageIdParamsSchema.parse({
        conversationId: "550e8400-e29b-41d4-a716-446655440000",
        messageId: "660e8400-e29b-41d4-a716-446655440001",
      });
      expect(result.conversationId).toBeDefined();
      expect(result.messageId).toBeDefined();
    });
  });

  describe("pinsParamsSchema", () => {
    it("accepts valid conversationId", () => {
      const cid = "550e8400-e29b-41d4-a716-446655440000";
      expect(pinsParamsSchema.parse({ conversationId: cid })).toEqual({ conversationId: cid });
    });
  });

  describe("pinsIdParamsSchema", () => {
    it("accepts valid UUIDs", () => {
      expect(() =>
        pinsIdParamsSchema.parse({
          conversationId: "bad",
          messageId: "550e8400-e29b-41d4-a716-446655440000",
        })
      ).toThrow();
    });
  });
});
