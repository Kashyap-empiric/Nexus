import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  handleMessageRead,
  handleConversationNew,
  handleConversationUpdate,
} from "../../socket/handlers/conversation.handlers";
import type { Conversation } from "@/modules/conversations/types/conversation";

vi.mock("@/modules/auth/store/useAuthStore", () => ({
  getAuthUser: vi.fn(() => ({ id: "user-1" })),
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function createConv(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: "conv-1",
    type: "DM",
    isPrivate: false,
    name: null,
    description: null,
    dmPair: null,
    workspaceId: null,
    members: [],
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    unreadCount: 0,
    ...overrides,
  };
}

describe("handleMessageRead", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
  });

  it("updates lastReadMessageId for the matching user in a conversation", () => {
    const conversations = [
      createConv({
        id: "conv-1",
        members: [
          { id: "m1", userId: "user-2", lastReadMessageId: "msg-1", user: { id: "user-2", username: "bob", fullName: "Bob", avatarUrl: null } },
        ],
      }),
    ];
    queryClient.setQueryData(["conversations"], conversations);

    const handler = handleMessageRead(queryClient);
    handler({ conversationId: "conv-1", userId: "user-2", lastReadMessageId: "msg-5" });

    const updated = queryClient.getQueryData<Conversation[]>(["conversations"]);
    expect(updated![0].members[0].lastReadMessageId).toBe("msg-5");
  });

  it("does not update if lastReadMessageId is not greater than current (string comparison)", () => {
    const conversations = [
      createConv({
        id: "conv-1",
        members: [
          { id: "m1", userId: "user-2", lastReadMessageId: "msg-10", user: { id: "user-2", username: "bob", fullName: "Bob", avatarUrl: null } },
        ],
      }),
    ];
    queryClient.setQueryData(["conversations"], conversations);

    const handler = handleMessageRead(queryClient);
    handler({ conversationId: "conv-1", userId: "user-2", lastReadMessageId: "msg-1" });

    const updated = queryClient.getQueryData<Conversation[]>(["conversations"]);
    expect(updated![0].members[0].lastReadMessageId).toBe("msg-10");
  });

  it("does nothing when conversationId is missing", () => {
    queryClient.setQueryData(["conversations"], [createConv()]);
    const handler = handleMessageRead(queryClient);
    
    handler({ conversationId: "", userId: "user-2", lastReadMessageId: "msg-5" } as { conversationId: string; userId: string; lastReadMessageId: string });
    const updated = queryClient.getQueryData<Conversation[]>(["conversations"]);
    expect(updated).toHaveLength(1);
  });

  it("does nothing when userId is missing", () => {
    queryClient.setQueryData(["conversations"], [createConv()]);
    const handler = handleMessageRead(queryClient);
    
    handler({ conversationId: "conv-1", userId: "", lastReadMessageId: "msg-5" } as { conversationId: string; userId: string; lastReadMessageId: string });
    const updated = queryClient.getQueryData<Conversation[]>(["conversations"]);
    expect(updated![0].members).toHaveLength(0);
  });

  it("sets unreadCount to 0 when the read event is from the current user", () => {
    const conversations = [
      createConv({ id: "conv-1", unreadCount: 5, members: [
        { id: "m1", userId: "user-1", lastReadMessageId: "msg-1", user: { id: "user-1", username: "alice", fullName: "Alice", avatarUrl: null } },
      ] }),
    ];
    queryClient.setQueryData(["conversations"], conversations);

    const handler = handleMessageRead(queryClient);
    handler({ conversationId: "conv-1", userId: "user-1", lastReadMessageId: "msg-10" });

    const updated = queryClient.getQueryData<Conversation[]>(["conversations"]);
    expect(updated![0].unreadCount).toBe(0);
  });

  it("also updates workspace-channels queries", () => {
    const conversations = [createConv({ id: "conv-1", members: [
      { id: "m1", userId: "user-2", lastReadMessageId: "msg-1", user: { id: "user-2", username: "bob", fullName: "Bob", avatarUrl: null } },
    ] })];
    queryClient.setQueryData(["workspace-channels", "ws-1"], conversations);

    const handler = handleMessageRead(queryClient);
    handler({ conversationId: "conv-1", userId: "user-2", lastReadMessageId: "msg-99" });

    const updated = queryClient.getQueryData<Conversation[]>(["workspace-channels", "ws-1"]);
    expect(updated![0].members[0].lastReadMessageId).toBe("msg-99");
  });
});

describe("handleConversationNew", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
  });

  it("adds new conversation to the top of the list", () => {
    const existing = [createConv({ id: "conv-1" })];
    queryClient.setQueryData(["conversations"], existing);

    const newConv = createConv({ id: "conv-2" });
    const handler = handleConversationNew(queryClient);
    handler(newConv);

    const updated = queryClient.getQueryData<Conversation[]>(["conversations"]);
    expect(updated).toHaveLength(2);
    expect(updated![0].id).toBe("conv-2");
  });

  it("does not duplicate existing conversations", () => {
    const existing = [createConv({ id: "conv-1" })];
    queryClient.setQueryData(["conversations"], existing);

    const handler = handleConversationNew(queryClient);
    handler(createConv({ id: "conv-1" }));

    const updated = queryClient.getQueryData<Conversation[]>(["conversations"]);
    expect(updated).toHaveLength(1);
  });

  it("does nothing for invalid payload", () => {
    queryClient.setQueryData(["conversations"], [createConv()]);
    const handler = handleConversationNew(queryClient);
    
    handler({} as { conversationId: string; userId: string; lastReadMessageId: string });
    const updated = queryClient.getQueryData<Conversation[]>(["conversations"]);
    expect(updated).toHaveLength(1);
  });

  it("does nothing if conversations cache is not set", () => {
    const handler = handleConversationNew(queryClient);
    handler(createConv({ id: "conv-1" }));
    const updated = queryClient.getQueryData<Conversation[]>(["conversations"]);
    expect(updated).toBeUndefined();
  });

  it("adds to workspace-channels when conversation has workspaceId", () => {
    const channels = [createConv({ id: "ch-1", workspaceId: "ws-1" })];
    queryClient.setQueryData(["workspace-channels", "ws-1"], channels);

    const newChannel = createConv({ id: "ch-2", workspaceId: "ws-1" });
    const handler = handleConversationNew(queryClient);
    handler(newChannel);

    const updated = queryClient.getQueryData<Conversation[]>(["workspace-channels", "ws-1"]);
    expect(updated).toHaveLength(2);
  });
});

describe("handleConversationUpdate", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
  });

  it("updates conversation fields", () => {
    const conversations = [createConv({ id: "conv-1", name: null, unreadCount: 3 })];
    queryClient.setQueryData(["conversations"], conversations);

    const handler = handleConversationUpdate(queryClient);
    handler({
      conversation: { id: "conv-1", name: "New Name", updatedAt: "2025-01-02T00:00:00Z", latestMessageId: null, latestMessage: null },
    });

    const updated = queryClient.getQueryData<Conversation[]>(["conversations"]);
    expect(updated![0].name).toBe("New Name");
    expect(updated![0].unreadCount).toBe(3);
  });

  it("preserves unreadCount during update", () => {
    const conversations = [createConv({ id: "conv-1", unreadCount: 5 })];
    queryClient.setQueryData(["conversations"], conversations);

    const handler = handleConversationUpdate(queryClient);
    handler({
      conversation: { id: "conv-1", name: null, updatedAt: "2025-01-02T00:00:00Z", latestMessageId: null, latestMessage: null },
    });

    const updated = queryClient.getQueryData<Conversation[]>(["conversations"]);
    expect(updated![0].unreadCount).toBe(5);
  });

  it("sorts conversations by updatedAt descending", () => {
    const conv1 = createConv({ id: "conv-1", updatedAt: "2025-01-01T00:00:00Z" });
    const conv2 = createConv({ id: "conv-2", updatedAt: "2025-01-01T00:00:00Z" });
    queryClient.setQueryData(["conversations"], [conv1, conv2]);

    const handler = handleConversationUpdate(queryClient);
    handler({
      conversation: { id: "conv-2", name: null, updatedAt: "2025-01-03T00:00:00Z", latestMessageId: null, latestMessage: null },
    });

    const updated = queryClient.getQueryData<Conversation[]>(["conversations"]);
    expect(updated![0].id).toBe("conv-2");
    expect(updated![1].id).toBe("conv-1");
  });

  it("does nothing for missing id", () => {
    queryClient.setQueryData(["conversations"], [createConv()]);
    const handler = handleConversationUpdate(queryClient);
    
    handler({ conversation: { id: "", name: null, updatedAt: "", latestMessageId: null, latestMessage: null } } as { conversation: { id: string; name: string | null; updatedAt: string; latestMessageId: string | null; latestMessage: null } });
    const updated = queryClient.getQueryData<Conversation[]>(["conversations"]);
    expect(updated).toHaveLength(1);
  });

  it("updates workspace-channels without sorting", () => {
    const channels = [createConv({ id: "ch-1", workspaceId: "ws-1", name: null })];
    queryClient.setQueryData(["workspace-channels", "ws-1"], channels);

    const handler = handleConversationUpdate(queryClient);
    handler({
      conversation: { id: "ch-1", name: "Updated", updatedAt: "2025-01-02T00:00:00Z", latestMessageId: null, latestMessage: null },
    });

    const updated = queryClient.getQueryData<Conversation[]>(["workspace-channels", "ws-1"]);
    expect(updated![0].name).toBe("Updated");
  });
});
