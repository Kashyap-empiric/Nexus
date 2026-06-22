import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  handleMessageNew,
  handleMessageUpdate,
  handleMessageDelete,
} from "../../socket/handlers/message.handlers";
import type { Message } from "@/modules/messages/types/message";
import type { Conversation } from "@/modules/conversations/types/conversation";

vi.mock("@/modules/auth/store/useAuthStore", () => ({
  getAuthUser: vi.fn(() => ({ id: "user-1" })),
}));

const mockUser = {
  id: "user-1",
  username: "testuser",
  fullName: "Test User",
  avatarUrl: null,
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function createMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "msg-1",
    content: "Hello world",
    conversationId: "conv-1",
    userId: "user-2",
    createdAt: new Date().toISOString(),
    user: mockUser,
    isEdited: false,
    deletedAt: null,
    ...overrides,
  };
}

function createConversation(overrides: Partial<Conversation> = {}): Conversation {
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

describe("handleMessageNew", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
  });

  it("increments unreadCount for the matching conversation", () => {
    const conversations = [
      createConversation({ id: "conv-1", unreadCount: 0 }),
      createConversation({ id: "conv-2", unreadCount: 0 }),
    ];
    queryClient.setQueryData(["conversations"], conversations);

    const handler = handleMessageNew(queryClient);
    handler(createMessage({ conversationId: "conv-1" }));

    const updated = queryClient.getQueryData<Conversation[]>(["conversations"]);
    expect(updated).toHaveLength(2);
    expect(updated![0].unreadCount).toBe(1);
    expect(updated![1].unreadCount).toBe(0);
  });

  it("does not increment unreadCount when message is from current user", () => {
    const conversations = [createConversation({ id: "conv-1", unreadCount: 0 })];
    queryClient.setQueryData(["conversations"], conversations);

    const handler = handleMessageNew(queryClient);
    handler(createMessage({ conversationId: "conv-1", userId: "user-1" }));

    const updated = queryClient.getQueryData<Conversation[]>(["conversations"]);
    expect(updated![0].unreadCount).toBe(0);
  });

  it("does not modify cache for non-matching conversation", () => {
    const conversations = [createConversation({ id: "conv-1", unreadCount: 5 })];
    queryClient.setQueryData(["conversations"], conversations);

    const handler = handleMessageNew(queryClient);
    handler(createMessage({ conversationId: "conv-999" }));

    const updated = queryClient.getQueryData<Conversation[]>(["conversations"]);
    expect(updated![0].unreadCount).toBe(5);
  });
});

describe("handleMessageUpdate", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
  });

  it("updates latestMessage content for the matching conversation", () => {
    const conversations = [
      createConversation({
        id: "conv-1",
        latestMessageId: "msg-1",
        latestMessage: {
          id: "msg-1",
          userId: "user-2",
          content: "Original content",
          deletedAt: null,
          createdAt: new Date().toISOString(),
          user: { username: "testuser", fullName: "Test User" },
        },
      }),
    ];
    queryClient.setQueryData(["conversations"], conversations);

    const handler = handleMessageUpdate(queryClient);
    handler(createMessage({ id: "msg-1", content: "Updated content" }));

    const updated = queryClient.getQueryData<Conversation[]>(["conversations"]);
    expect(updated![0].latestMessage?.content).toBe("Updated content");
  });

  it("does not update non-matching conversations", () => {
    const conversations = [
      createConversation({
        id: "conv-1",
        latestMessageId: "msg-1",
        latestMessage: {
          id: "msg-1",
          userId: "user-2",
          content: "Original",
          deletedAt: null,
          createdAt: new Date().toISOString(),
          user: { username: "testuser", fullName: "Test User" },
        },
      }),
    ];
    queryClient.setQueryData(["conversations"], conversations);

    const handler = handleMessageUpdate(queryClient);
    handler(createMessage({ id: "msg-999", content: "Updated" }));

    const updated = queryClient.getQueryData<Conversation[]>(["conversations"]);
    expect(updated![0].latestMessage?.content).toBe("Original");
  });
});

describe("handleMessageDelete", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
  });

  it("marks latestMessage as deleted for the matching conversation", () => {
    const conversations = [
      createConversation({
        id: "conv-1",
        latestMessageId: "msg-1",
        latestMessage: {
          id: "msg-1",
          userId: "user-2",
          content: "Content to delete",
          deletedAt: null,
          createdAt: new Date().toISOString(),
          user: { username: "testuser", fullName: "Test User" },
        },
      }),
    ];
    queryClient.setQueryData(["conversations"], conversations);

    const handler = handleMessageDelete(queryClient);
    handler(
      createMessage({
        id: "msg-1",
        deletedAt: new Date().toISOString(),
      }),
    );

    const updated = queryClient.getQueryData<Conversation[]>(["conversations"]);
    expect(updated![0].latestMessage?.deletedAt).not.toBeNull();
  });

  it("does not modify conversations where latestMessageId does not match", () => {
    const conversations = [
      createConversation({
        id: "conv-1",
        latestMessageId: "msg-1",
        latestMessage: {
          id: "msg-1",
          userId: "user-2",
          content: "Keep this",
          deletedAt: null,
          createdAt: new Date().toISOString(),
          user: { username: "testuser", fullName: "Test User" },
        },
      }),
    ];
    queryClient.setQueryData(["conversations"], conversations);

    const handler = handleMessageDelete(queryClient);
    handler(
      createMessage({
        id: "msg-999",
        deletedAt: new Date().toISOString(),
      }),
    );

    const updated = queryClient.getQueryData<Conversation[]>(["conversations"]);
    expect(updated![0].latestMessage?.deletedAt).toBeNull();
  });
});
