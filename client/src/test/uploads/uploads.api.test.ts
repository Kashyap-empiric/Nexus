import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadsApi } from "@/modules/uploads/api/uploads.api";
import { api } from "@/shared/lib/api";

vi.mock("@/shared/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("uploadsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createAttachmentRecord", () => {
    const payload = {
      conversationId: "conv-1",
      originalName: "photo.png",
      size: 1024,
      mimeType: "image/png",
      extension: "png",
      fileName: "photo.png",
    };

    it("calls POST /uploads with correct data", async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { id: "att-1", ...payload } });

      await uploadsApi.createAttachmentRecord(payload);

      expect(api.post).toHaveBeenCalledWith("/uploads", payload);
    });

    it("returns the attachment record", async () => {
      const expected = { id: "att-1", ...payload, createdAt: "2024-01-01", createdBy: "user-1", storagePath: "path", messageId: null, downloadUrl: undefined };
      vi.mocked(api.post).mockResolvedValue({ data: expected });

      const result = await uploadsApi.createAttachmentRecord(payload);

      expect(result).toEqual(expected);
    });
  });

  describe("deleteAttachmentRecord", () => {
    it("calls DELETE /uploads/:id", async () => {
      vi.mocked(api.delete).mockResolvedValue({});

      await uploadsApi.deleteAttachmentRecord("att-1");

      expect(api.delete).toHaveBeenCalledWith("/uploads/att-1");
    });
  });

  describe("getAttachmentDownloadUrl", () => {
    it("calls GET /uploads/:id/download", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { url: "https://signed.url" } });

      const result = await uploadsApi.getAttachmentDownloadUrl("att-1");

      expect(api.get).toHaveBeenCalledWith("/uploads/att-1/download");
      expect(result).toEqual({ url: "https://signed.url" });
    });
  });
});
