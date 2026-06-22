import { describe, it, expect } from "vitest";
import { groupMessages } from "@/modules/chat/utils/groupMessages";
import type { Message } from "@/modules/messages/types/message";

function createMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "msg-1",
    content: "Hello",
    conversationId: "conv-1",
    userId: "user-1",
    createdAt: new Date("2025-01-01T00:00:00Z").toISOString(),
    user: { id: "user-1", username: "alice", fullName: "Alice", avatarUrl: null },
    isEdited: false,
    deletedAt: null,
    ...overrides,
  };
}

describe("groupMessages", () => {
  it("returns empty array for empty input", () => {
    expect(groupMessages([])).toEqual([]);
  });

  it("creates a single group for one message", () => {
    const msg = createMessage();
    const groups = groupMessages([msg]);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe(msg.id);
    expect(groups[0].messages).toHaveLength(1);
  });

  it("groups consecutive messages from the same user", () => {
    const msg1 = createMessage({ id: "msg-1", createdAt: "2025-01-01T00:00:00Z" });
    const msg2 = createMessage({ id: "msg-2", createdAt: "2025-01-01T00:00:30Z" });

    const groups = groupMessages([msg1, msg2]);
    expect(groups).toHaveLength(1);
    expect(groups[0].messages).toHaveLength(2);
  });

  it("splits groups when messages are from different users", () => {
    const msg1 = createMessage({ id: "msg-1", userId: "user-1", createdAt: "2025-01-01T00:00:00Z" });
    const msg2 = createMessage({ id: "msg-2", userId: "user-2", createdAt: "2025-01-01T00:00:30Z" });

    const groups = groupMessages([msg1, msg2]);
    expect(groups).toHaveLength(2);
  });

  it("splits groups when time difference exceeds 1 minute", () => {
    const msg1 = createMessage({ id: "msg-1", createdAt: "2025-01-01T00:00:00Z" });
    const msg2 = createMessage({ id: "msg-2", createdAt: "2025-01-01T00:02:00Z" });

    const groups = groupMessages([msg1, msg2]);
    expect(groups).toHaveLength(2);
  });

  it("groups same user within 1 minute but splits across the boundary", () => {
    const msg1 = createMessage({ id: "msg-1", userId: "user-1", createdAt: "2025-01-01T00:00:00Z" });
    const msg2 = createMessage({ id: "msg-2", userId: "user-1", createdAt: "2025-01-01T00:00:59Z" });
    const msg3 = createMessage({ id: "msg-3", userId: "user-2", createdAt: "2025-01-01T00:01:00Z" });

    const groups = groupMessages([msg1, msg2, msg3]);
    expect(groups).toHaveLength(2);
    expect(groups[0].messages).toHaveLength(2);
    expect(groups[1].messages).toHaveLength(1);
  });

  it("uses the first message's id as the group id", () => {
    const msg1 = createMessage({ id: "msg-1", createdAt: "2025-01-01T00:00:00Z" });
    const msg2 = createMessage({ id: "msg-2", createdAt: "2025-01-01T00:00:30Z" });

    const groups = groupMessages([msg1, msg2]);
    expect(groups[0].id).toBe("msg-1");
  });
});
