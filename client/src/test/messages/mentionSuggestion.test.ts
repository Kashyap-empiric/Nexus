import { describe, it, expect } from "vitest";
import { getMentionSuggestionOptions } from "@/modules/messages/components/mentionSuggestion";
import type { ConversationMember } from "@/modules/conversations/types/conversation";

const mockMembers: ConversationMember[] = [
  { id: "1", userId: "u1", conversationId: "c1", lastReadMessageId: null, joinedAt: new Date().toISOString(), user: { id: "u1", username: "alice", fullName: "Alice Smith", avatarUrl: null } },
  { id: "2", userId: "u2", conversationId: "c1", lastReadMessageId: null, joinedAt: new Date().toISOString(), user: { id: "u2", username: "bob", fullName: "Bob Jones", avatarUrl: null } },
  { id: "3", userId: "u3", conversationId: "c1", lastReadMessageId: null, joinedAt: new Date().toISOString(), user: { id: "u3", username: "charlie", fullName: null, avatarUrl: null } },
  { id: "4", userId: "u4", conversationId: "c1", lastReadMessageId: null, joinedAt: new Date().toISOString(), user: { id: "u4", username: "alex", fullName: "Alex Brown", avatarUrl: null } },
];

describe("getMentionSuggestionOptions", () => {
  const options = getMentionSuggestionOptions(mockMembers);

  describe("items", () => {
    it("filters members by username prefix", () => {
      const items = options.items({ query: "ali" });
      expect(items).toHaveLength(1);
      expect(items[0].username).toBe("alice");
    });

    it("returns all members when query is empty", () => {
      const items = options.items({ query: "" });
      expect(items).toHaveLength(4);
    });

    it("is case-insensitive", () => {
      const items = options.items({ query: "AL" });
      expect(items).toHaveLength(2);
      const usernames = items.map((i) => i.username);
      expect(usernames).toContain("alice");
      expect(usernames).toContain("alex");
    });

    it("returns empty array when no match", () => {
      const items = options.items({ query: "zack" });
      expect(items).toHaveLength(0);
    });

    it("limits results to 10", () => {
      const manyMembers: ConversationMember[] = Array.from({ length: 15 }, (_, i) => ({
        id: `${i}`,
        userId: `u${i}`,
        conversationId: "c1",
        lastReadMessageId: null,
        joinedAt: new Date().toISOString(),
        user: { id: `u${i}`, username: `user${i}`, fullName: null, avatarUrl: null },
      }));
      const opts = getMentionSuggestionOptions(manyMembers);
      const items = opts.items({ query: "user" });
      expect(items).toHaveLength(10);
    });
  });

  describe("render", () => {
    it("returns onStart, onUpdate, onKeyDown, onExit", () => {
      const renderObj = options.render();
      expect(renderObj).toHaveProperty("onStart");
      expect(renderObj).toHaveProperty("onUpdate");
      expect(renderObj).toHaveProperty("onKeyDown");
      expect(renderObj).toHaveProperty("onExit");
    });
  });
});
