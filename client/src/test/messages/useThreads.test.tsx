import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFollowThread, useUnfollowThread, useUpdateThreadNotifications, useChannelThreads, useWorkspaceThreads, THREADS_KEYS } from "@/modules/messages/hooks/useThreads";
import * as apiModule from "@/modules/messages/api/messages.api";
import type React from "react";

vi.mock("@/modules/messages/api/messages.api", () => ({
  getChannelThreads: vi.fn(),
  getWorkspaceThreads: vi.fn(),
  followThread: vi.fn(),
  unfollowThread: vi.fn(),
  updateThreadNotifications: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useThreads hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("THREADS_KEYS", () => {
    it("generates correct query keys", () => {
      expect(THREADS_KEYS.all).toEqual(["threads"]);
      expect(THREADS_KEYS.channel("c1")).toEqual(["threads", "channel", "c1"]);
      expect(THREADS_KEYS.workspace("w1")).toEqual(["threads", "workspace", "w1"]);
    });
  });

  describe("useChannelThreads", () => {
    it("is not enabled when conversationId is null", () => {
      const { result } = renderHook(() => useChannelThreads(null), { wrapper: createWrapper() });
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe("useWorkspaceThreads", () => {
    it("is not enabled when workspaceId is null", () => {
      const { result } = renderHook(() => useWorkspaceThreads(null), { wrapper: createWrapper() });
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe("useFollowThread", () => {
    it("calls followThread with correct params", async () => {
      vi.mocked(apiModule.followThread).mockResolvedValue({ success: true });
      const { result } = renderHook(() => useFollowThread(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ conversationId: "c1", messageId: "m1" });
      });

      expect(apiModule.followThread).toHaveBeenCalledWith("c1", "m1");
    });
  });

  describe("useUnfollowThread", () => {
    it("calls unfollowThread with correct params", async () => {
      vi.mocked(apiModule.unfollowThread).mockResolvedValue({ success: true });
      const { result } = renderHook(() => useUnfollowThread(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ conversationId: "c1", messageId: "m1" });
      });

      expect(apiModule.unfollowThread).toHaveBeenCalledWith("c1", "m1");
    });
  });

  describe("useUpdateThreadNotifications", () => {
    it("calls updateThreadNotifications with correct params", async () => {
      vi.mocked(apiModule.updateThreadNotifications).mockResolvedValue({ success: true });
      const { result } = renderHook(() => useUpdateThreadNotifications(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ conversationId: "c1", messageId: "m1", level: "ALL" });
      });

      expect(apiModule.updateThreadNotifications).toHaveBeenCalledWith("c1", "m1", "ALL");
    });
  });
});
