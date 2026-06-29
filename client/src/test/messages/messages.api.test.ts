import { describe, it, expect, vi, beforeEach } from "vitest";
import { followThread, unfollowThread, updateThreadNotifications } from "@/modules/messages/api/messages.api";
import { api } from "@/shared/lib/api";

vi.mock("@/shared/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("messages.api - thread follow/unfollow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("followThread", () => {
    it("calls POST with correct URL", async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
      await followThread("conv-1", "msg-1");
      expect(api.post).toHaveBeenCalledWith("/conversations/conv-1/messages/msg-1/thread/follow");
    });

    it("returns response data", async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
      const result = await followThread("conv-1", "msg-1");
      expect(result).toEqual({ success: true });
    });
  });

  describe("unfollowThread", () => {
    it("calls DELETE with correct URL", async () => {
      vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });
      await unfollowThread("conv-1", "msg-1");
      expect(api.delete).toHaveBeenCalledWith("/conversations/conv-1/messages/msg-1/thread/follow");
    });

    it("returns response data", async () => {
      vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });
      const result = await unfollowThread("conv-1", "msg-1");
      expect(result).toEqual({ success: true });
    });
  });

  describe("updateThreadNotifications", () => {
    it("calls PATCH with correct URL and body", async () => {
      vi.mocked(api.patch).mockResolvedValue({ data: { success: true } });
      await updateThreadNotifications("conv-1", "msg-1", "ALL");
      expect(api.patch).toHaveBeenCalledWith(
        "/conversations/conv-1/messages/msg-1/thread/notifications",
        { level: "ALL" }
      );
    });

    it("sends MENTIONS level", async () => {
      vi.mocked(api.patch).mockResolvedValue({ data: { success: true } });
      await updateThreadNotifications("conv-1", "msg-1", "MENTIONS");
      expect(api.patch).toHaveBeenCalledWith(
        "/conversations/conv-1/messages/msg-1/thread/notifications",
        { level: "MENTIONS" }
      );
    });

    it("sends MUTED level", async () => {
      vi.mocked(api.patch).mockResolvedValue({ data: { success: true } });
      await updateThreadNotifications("conv-1", "msg-1", "MUTED");
      expect(api.patch).toHaveBeenCalledWith(
        "/conversations/conv-1/messages/msg-1/thread/notifications",
        { level: "MUTED" }
      );
    });
  });
});
