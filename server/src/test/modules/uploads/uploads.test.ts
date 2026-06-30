import { describe, it, expect, vi, beforeEach } from "vitest";
import { processUpload, removeAttachment, getAttachmentDownloadUrl } from "@/modules/uploads/uploads.service.js";
import { prisma } from "@/lib/db.js";
import { verifyConversationMembership } from "@/shared/permissions.js";
import { supabaseAdmin } from "@/lib/supabase.js";
import { ForbiddenError, ConflictError, NotFoundError } from "@/lib/app-error.js";

interface MockAttachment {
  id: string;
  messageId: string | null;
  storagePath: string;
  originalName: string;
  mimeType: string;
  extension: string;
  size: number;
  width: number | null;
  height: number | null;
  createdBy: string;
  createdAt: Date;
  conversationId: string;
}

function makeAttachment(overrides: Partial<MockAttachment> = {}): MockAttachment {
  return {
    id: "att-1",
    messageId: null,
    storagePath: "test/path.png",
    originalName: "test.png",
    mimeType: "image/png",
    extension: "png",
    size: 1024,
    width: null,
    height: null,
    createdBy: "user-1",
    createdAt: new Date(),
    conversationId: "conv-1",
    ...overrides,
  };
}

vi.mock("@/lib/db.js", () => ({
  prisma: {
    attachment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    }
  }
}));

vi.mock("@/shared/permissions.js", () => ({
  verifyConversationMembership: vi.fn(),
}));

vi.mock("@/lib/supabase.js", () => ({
  supabaseAdmin: {
    storage: {
      from: vi.fn().mockReturnThis(),
      remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      createSignedUrls: vi.fn().mockResolvedValue({ data: [{ path: "test/path.png", signedUrl: "/signed-path.png" }], error: null }),
    }
  }
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Uploads Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("processUpload", () => {
    it("should create attachment record for valid member", async () => {
      const data = {
        originalName: "photo.png",
        mimeType: "image/png" as const,
        size: 2048,
        extension: "png" as const,
        fileName: "photo.png",
        conversationId: "conv-1",
      };
      vi.mocked(verifyConversationMembership).mockResolvedValue(true);
      vi.mocked(prisma.attachment.create).mockResolvedValue(makeAttachment({
        id: "att-new",
        originalName: "photo.png",
        size: 2048,
      }));

      const result = await processUpload(data, "user-1");

      expect(verifyConversationMembership).toHaveBeenCalledWith("user-1", "conv-1");
      expect(prisma.attachment.create).toHaveBeenCalled();
      expect(result.id).toBe("att-new");
    });

    it("should throw ForbiddenError if not a member", async () => {
      const data = {
        originalName: "photo.png",
        mimeType: "image/png" as const,
        size: 2048,
        extension: "png" as const,
        fileName: "photo.png",
        conversationId: "conv-1",
      };
      vi.mocked(verifyConversationMembership).mockResolvedValue(false);

      await expect(processUpload(data, "user-1")).rejects.toThrow(ForbiddenError);
      expect(prisma.attachment.create).not.toHaveBeenCalled();
    });
  });

  describe("removeAttachment", () => {
    it("should delete attachment and object from storage", async () => {
      const mockAttachment = makeAttachment({ messageId: null });
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue(mockAttachment);
      mockFetch.mockResolvedValue({ ok: true } as Response);

      await removeAttachment("att-1", "user-1");

      expect(prisma.attachment.delete).toHaveBeenCalledWith({ where: { id: "att-1" } });
      expect(supabaseAdmin.storage.from).toHaveBeenCalledWith("attachments");
      expect(supabaseAdmin.storage.from("attachments").remove).toHaveBeenCalledWith(["test/path.png"]);
    });

    it("should throw ConflictError if already attached (409)", async () => {
      const mockAttachment = makeAttachment({ messageId: "msg-1" });
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue(mockAttachment);

      await expect(removeAttachment("att-1", "user-1")).rejects.toThrow(ConflictError);
    });

    it("should throw ForbiddenError if not the owner", async () => {
      const mockAttachment = makeAttachment({ createdBy: "user-2", messageId: null });
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue(mockAttachment);

      await expect(removeAttachment("att-1", "user-1")).rejects.toThrow(ForbiddenError);
    });

    it("should throw NotFoundError if attachment does not exist", async () => {
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue(null);

      await expect(removeAttachment("missing", "user-1")).rejects.toThrow(NotFoundError);
    });
  });

  describe("getAttachmentDownloadUrl", () => {
    it("should throw ForbiddenError if user is not in conversation (403)", async () => {
      const mockAttachment = makeAttachment({ createdBy: "user-2" });
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue(mockAttachment);
      vi.mocked(verifyConversationMembership).mockResolvedValue(false);

      await expect(getAttachmentDownloadUrl("att-1", "user-1")).rejects.toThrow(ForbiddenError);
    });

    it("should throw NotFoundError if attachment does not exist (404)", async () => {
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue(null);
      await expect(getAttachmentDownloadUrl("missing", "user-1")).rejects.toThrow(NotFoundError);
    });

    it("should return signed URL if authorized", async () => {
      const mockAttachment = makeAttachment({ createdBy: "user-2" });
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue(mockAttachment);
      vi.mocked(verifyConversationMembership).mockResolvedValue(true);

      const url = await getAttachmentDownloadUrl("att-1", "user-1");
      expect(url).toContain("/signed-path.png");
    });
  });
});
