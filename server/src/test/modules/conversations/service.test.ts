import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupPrismaMock, mockPrisma, resetPrismaMock } from "../../mock-db.js";

process.env.SUPABASE_URL = "https://test-project.supabase.co";

setupPrismaMock();

const conversationsService = await import("@/modules/conversations/conversations.service.js");

vi.mock("@/socket/socket.dispatcher.js", () => ({
  dispatchMessageEvent: vi.fn(),
  dispatchPinEvent: vi.fn(),
}));

describe("conversations service", () => {
  beforeEach(() => {
    resetPrismaMock();
    vi.clearAllMocks();
  });

  describe("getUserConversations", () => {
    it("returns user's DM conversations with unread counts", async () => {
      const fakeConversations = [
        {
          id: "conv-1",
          type: "DM",
          name: null,
          dmPair: "user-1:user-2",
          createdAt: new Date(),
          updatedAt: new Date(),
          latestMessageId: "msg-1",
          latestMessage: {
            id: "msg-1",
            userId: "user-2",
            content: "Hello!",
            deletedAt: null,
            createdAt: new Date(),
            user: { username: "bob" },
          },
          workspaceId: null,
          isPrivate: true,
          visibility: "PUBLIC",
          createdBy: "user-1",
          description: null,
          members: [
            { userId: "user-1", lastReadMessageId: "some-old-msg", joinedAt: new Date(), conversationId: "conv-1" },
            { userId: "user-2", lastReadMessageId: null, joinedAt: new Date(), conversationId: "conv-1" },
          ],
        },
      ];

      mockPrisma.conversation.findMany.mockResolvedValueOnce(fakeConversations as any);
      mockPrisma.conversationMember.count.mockResolvedValueOnce(2);
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ conversation_id: "conv-1", count: "3" }]);

      const result = await conversationsService.getUserConversations("user-1");
      expect(result).toHaveLength(1);
      expect(result[0].unreadCount).toBeDefined();
    });
  });

  describe("createOrGetDM", () => {
    it("creates a new DM conversation", async () => {
      mockPrisma.conversation.findFirst.mockResolvedValueOnce(null);

      const newConv = {
        id: "new-conv",
        type: "DM",
        workspaceId: null,
        isPrivate: true,
        dmPair: "user-1:user-2",
        members: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        latestMessageId: null,
        createdBy: "user-1",
        visibility: "PUBLIC",
        description: null,
        name: null,
      };

      mockPrisma.conversation.create.mockResolvedValueOnce(newConv as any);

      const result = await conversationsService.createOrGetDM("user-1", "user-2");
      expect(result.created).toBe(true);
      expect(result.conversation.id).toBe("new-conv");
    });

    it("returns existing DM if duplicate caught (P2002)", async () => {
      mockPrisma.conversation.findUnique
        .mockResolvedValueOnce(null) 
        .mockResolvedValueOnce({ 
          id: "existing-conv",
          type: "DM",
          members: [],
        } as any);

      const prismaError: any = new Error("Unique constraint failed");
      prismaError.code = "P2002";
      mockPrisma.conversation.create.mockRejectedValueOnce(prismaError);

      const result = await conversationsService.createOrGetDM("user-1", "user-2");
      expect(result.created).toBe(false);
      expect(result.conversation.id).toBe("existing-conv");
    });
  });
});
