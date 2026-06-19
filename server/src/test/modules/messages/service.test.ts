import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupPrismaMock, mockPrisma, resetPrismaMock } from "../../mock-db.js";
import { setupTransactionMock } from "../../mock-transaction.js";

process.env.SUPABASE_URL = "https://test-project.supabase.co";

setupPrismaMock();
setupTransactionMock();

const messagesService = await import("@/modules/messages/messages.service.js");
const { uuidv7 } = await import("uuidv7");

vi.mock("@/socket/socket.dispatcher.js", () => ({
  dispatchPinEvent: vi.fn(),
  dispatchMessageEvent: vi.fn(),
}));

vi.mock("@/modules/notifications/notifications.service.js", () => ({
  createAndDispatch: vi.fn(),
}));

vi.mock("@/services/push.service.js", () => ({
  sendPushNotification: vi.fn(),
}));

vi.mock("@/modules/auth/auth.repository.js", () => ({
  findWorkspaceMember: vi.fn(),
}));

describe("messages service", () => {
  beforeEach(() => {
    resetPrismaMock();
    vi.clearAllMocks();
  });


  describe("getMessages", () => {
    it("returns messages with pagination info", async () => {
      const fakeMessages = [
        { id: "msg-1", content: "First", user: { username: "alice" } },
        { id: "msg-2", content: "Second", user: { username: "alice" } },
        { id: "msg-3", content: "Third", user: { username: "bob" } },
      ];

      mockPrisma.message.findMany.mockResolvedValueOnce([...fakeMessages, { id: "msg-4", content: "Extra" } as any]);

      mockPrisma.pinnedMessage.findMany.mockResolvedValueOnce([
        { messageId: "msg-1" },
      ]);

      const result = await messagesService.getMessages("conv-1", undefined, 3);

      expect(result.messages).toHaveLength(3);
      expect(result.nextCursor).toBe("msg-3");
      expect(result.pinnedMessageIds).toEqual(["msg-1"]);
    });

    it("returns null cursor when no more pages", async () => {
      const fakeMessages = [
        { id: "msg-1", content: "Only", user: { username: "alice" } },
      ];

      mockPrisma.message.findMany.mockResolvedValueOnce(fakeMessages as any);
      mockPrisma.pinnedMessage.findMany.mockResolvedValueOnce([]);

      const result = await messagesService.getMessages("conv-1", "msg-0", 50);

      expect(result.messages).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });
  });


  describe("createMessage", () => {
    it("creates a message and returns it with metadata", async () => {
      const messageId = uuidv7();
      const now = new Date();

      mockPrisma.message.findUnique.mockResolvedValueOnce(null); 

      const fakeCreatedMessage = {
        id: messageId,
        content: "Hello!",
        userId: "user-1",
        deletedAt: null,
        createdAt: now,
        user: { username: "alice" },
      };

      const fakeConversation = {
        id: "conv-1",
        name: null,
        updatedAt: now,
        latestMessageId: messageId,
      };

      mockPrisma.$transaction.mockResolvedValueOnce([
        fakeCreatedMessage,
        fakeConversation,
        { count: 1 },
      ]);

      const result = await messagesService.createMessage("conv-1", "user-1", "Hello!");

      expect(result.message).toBeDefined();
      expect(result.conversationMetadata).toBeDefined();
      expect(result.message.content).toBe("Hello!");
    });

    it("throws when replying to a non-existent message", async () => {
      mockPrisma.message.findUnique.mockResolvedValueOnce(null);

      await expect(
        messagesService.createMessage("conv-1", "user-1", "Reply", "nonexistent-id")
      ).rejects.toThrow("Reply target message not found.");
    });

    it("throws when replying to a message in a different conversation", async () => {
      mockPrisma.message.findUnique.mockResolvedValueOnce({
        id: "parent-msg",
        userId: "user-2",
        conversationId: "other-conv",
      } as any);

      await expect(
        messagesService.createMessage("conv-1", "user-1", "Reply", "parent-msg")
      ).rejects.toThrow("Cannot reply to a message in a different conversation.");
    });
  });


  describe("editMessage", () => {
    it("edits own non-deleted message", async () => {
      const fakeMessage: any = {
        id: "msg-1",
        content: "Original",
        userId: "user-1",
        conversationId: "conv-1",
        deletedAt: null,
        conversation: { id: "conv-1", name: null, latestMessageId: "msg-1", updatedAt: new Date() },
        user: { username: "alice" },
      };

      const fakeUpdated: any = {
        ...fakeMessage,
        content: "Edited!",
        isEdited: true,
      };

      mockPrisma.message.findUnique.mockResolvedValueOnce(fakeMessage);
      mockPrisma.message.update.mockResolvedValueOnce(fakeUpdated);

      const result = await messagesService.editMessage("msg-1", "conv-1", "user-1", "Edited!");

      expect(result.message.content).toBe("Edited!");
      expect(result.conversationMetadata).not.toBeNull();
    });

    it("throws when message not found", async () => {
      mockPrisma.message.findUnique.mockResolvedValueOnce(null);

      await expect(
        messagesService.editMessage("nonexistent", "conv-1", "user-1", "Edit")
      ).rejects.toThrow("Message not found.");
    });

    it("throws when message is deleted", async () => {
      mockPrisma.message.findUnique.mockResolvedValueOnce({
        id: "msg-1",
        deletedAt: new Date(),
        userId: "user-1",
        conversationId: "conv-1",
      } as any);

      await expect(
        messagesService.editMessage("msg-1", "conv-1", "user-1", "Edit")
      ).rejects.toThrow("Cannot edit a deleted message.");
    });

    it("throws when editing another user's message", async () => {
      mockPrisma.message.findUnique.mockResolvedValueOnce({
        id: "msg-1",
        deletedAt: null,
        userId: "user-2",
        conversationId: "conv-1",
      } as any);

      await expect(
        messagesService.editMessage("msg-1", "conv-1", "user-1", "Edit")
      ).rejects.toThrow("403 Forbidden");
    });
  });


  describe("deleteMessage", () => {
    it("soft-deletes own message", async () => {
      const fakeMessage: any = {
        id: "msg-1",
        content: "To delete",
        userId: "user-1",
        conversationId: "conv-1",
        deletedAt: null,
        conversation: { id: "conv-1", name: null, latestMessageId: "not-msg-1", updatedAt: new Date() },
        user: { username: "alice" },
      };

      mockPrisma.message.findUnique.mockResolvedValueOnce(fakeMessage);

      const txMock = {
        message: {
          findFirst: vi.fn().mockResolvedValue(null),
          update: vi.fn().mockResolvedValue({ ...fakeMessage, deletedAt: new Date() }),
        },
        pinnedMessage: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        conversation: {
          update: vi.fn().mockResolvedValue({
            id: "conv-1",
            latestMessageId: null,
          }),
        },
      };

      mockPrisma.$transaction.mockImplementationOnce((fn: any) => fn(txMock));

      const result = await messagesService.deleteMessage("msg-1", "conv-1", "user-1");

      expect(result.message.deletedAt).toBeDefined();
    });

    it("throws when deleting already deleted message", async () => {
      mockPrisma.message.findUnique.mockResolvedValueOnce({
        id: "msg-1",
        deletedAt: new Date(),
        userId: "user-1",
        conversationId: "conv-1",
      } as any);

      await expect(
        messagesService.deleteMessage("msg-1", "conv-1", "user-1")
      ).rejects.toThrow("Message is already deleted.");
    });

    it("throws when deleting another user's message", async () => {
      mockPrisma.message.findUnique.mockResolvedValueOnce({
        id: "msg-1",
        deletedAt: null,
        userId: "user-2",
        conversationId: "conv-1",
      } as any);

      await expect(
        messagesService.deleteMessage("msg-1", "conv-1", "user-1")
      ).rejects.toThrow("403 Forbidden");
    });
  });


  describe("pinMessage", () => {
    it("pins a message in a DM (no workspace check)", async () => {
      mockPrisma.message.findUnique.mockResolvedValueOnce({
        id: "msg-1",
        conversationId: "conv-1",
      } as any);

      mockPrisma.conversation.findUnique.mockResolvedValueOnce({
        id: "conv-1",
        workspaceId: null,
      } as any);

      mockPrisma.pinnedMessage.findUnique.mockResolvedValueOnce(null);

      mockPrisma.pinnedMessage.create.mockResolvedValueOnce({
        messageId: "msg-1",
        conversationId: "conv-1",
        pinnedBy: "user-1",
        pinnedByUser: { username: "alice" },
      } as any);

      const result = await messagesService.pinMessage("msg-1", "conv-1", "user-1");
      expect(result.messageId).toBe("msg-1");
    });

    it("throws if message already pinned", async () => {
      mockPrisma.message.findUnique.mockResolvedValueOnce({
        id: "msg-1",
        conversationId: "conv-1",
      } as any);

      mockPrisma.conversation.findUnique.mockResolvedValueOnce({
        id: "conv-1",
        workspaceId: null,
      } as any);

      mockPrisma.pinnedMessage.findUnique.mockResolvedValueOnce({
        messageId: "msg-1",
      } as any);

      await expect(
        messagesService.pinMessage("msg-1", "conv-1", "user-1")
      ).rejects.toThrow("Message is already pinned.");
    });
  });

  describe("unpinMessage", () => {
    it("unpins a message", async () => {
      mockPrisma.conversation.findUnique.mockResolvedValueOnce({
        id: "conv-1",
        workspaceId: null,
      } as any);

      mockPrisma.pinnedMessage.findUnique.mockResolvedValueOnce({
        messageId: "msg-1",
      } as any);

      mockPrisma.pinnedMessage.delete.mockResolvedValueOnce({ messageId: "msg-1" } as any);

      const result = await messagesService.unpinMessage("msg-1", "conv-1", "user-1");
      expect(result.messageId).toBe("msg-1");
    });

    it("throws if message not pinned", async () => {
      mockPrisma.conversation.findUnique.mockResolvedValueOnce({
        id: "conv-1",
        workspaceId: null,
      } as any);

      mockPrisma.pinnedMessage.findUnique.mockResolvedValueOnce(null);

      await expect(
        messagesService.unpinMessage("msg-1", "conv-1", "user-1")
      ).rejects.toThrow("Message is not pinned.");
    });
  });


  describe("searchMessages", () => {
    it("searches for messages", async () => {
      const fakeResults = [
        { id: "msg-1", content: "hello world", user: { username: "alice" } },
      ];

      mockPrisma.message.findMany.mockResolvedValueOnce(fakeResults as any);

      const result = await messagesService.searchMessages("hello", "user-1", 10);
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("hello world");
    });
  });


  describe("sendMessageNotifications", () => {
    it("sends push to DM members with notifications enabled", async () => {
      const conv: any = {
        id: "conv-1",
        type: "DM",
        name: null,
        members: [
          { userId: "user-1" }, 
          { userId: "user-2" },
          { userId: "user-3" },
        ],
      };

      mockPrisma.conversation.findUnique.mockResolvedValueOnce(conv);

      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          id: "user-2",
          pushNotificationsEnabled: true,
          dmNotifications: true,
          channelNotifications: false,
          mentionNotifications: true,
          username: "bob",
        })
        .mockResolvedValueOnce({
          id: "user-3",
          pushNotificationsEnabled: false,
          dmNotifications: true,
          channelNotifications: false,
          mentionNotifications: true,
          username: "charlie",
        });

      const { sendPushNotification } = await import("@/services/push.service.js");

      await messagesService.sendMessageNotifications("conv-1", "user-1", "alice", "Hello!");

      expect(sendPushNotification).toHaveBeenCalledTimes(1);
      expect(sendPushNotification).toHaveBeenCalledWith("user-2", expect.objectContaining({
        title: "alice",
        body: "Hello!",
      }));
    });
  });
});
