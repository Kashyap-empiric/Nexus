import { describe, it, expect, beforeEach } from "vitest";
import { useChatStore } from "@/modules/chat/store/chatStore";

beforeEach(() => {
  useChatStore.getState().clearAll();
});

describe("useChatStore", () => {
  it("has correct initial state", () => {
    const state = useChatStore.getState();
    expect(state.mode).toBe("DM");
    expect(state.activeWorkspaceId).toBeNull();
    expect(state.activeConversationId).toBeNull();
    expect(state.lastVisitedChannels).toEqual({});
    expect(state.drafts.size).toBe(0);
    expect(state.headerInfo).toBeNull();
  });

  it("setMode updates the mode", () => {
    useChatStore.getState().setMode("WORKSPACE");
    expect(useChatStore.getState().mode).toBe("WORKSPACE");
  });

  it("setActiveWorkspaceId updates workspace id", () => {
    useChatStore.getState().setActiveWorkspaceId("ws-1");
    expect(useChatStore.getState().activeWorkspaceId).toBe("ws-1");
  });

  it("setActiveWorkspaceId(null) clears workspace id", () => {
    useChatStore.getState().setActiveWorkspaceId("ws-1");
    useChatStore.getState().setActiveWorkspaceId(null);
    expect(useChatStore.getState().activeWorkspaceId).toBeNull();
  });

  it("setActiveConversationId updates conversation id", () => {
    useChatStore.getState().setActiveConversationId("conv-1");
    expect(useChatStore.getState().activeConversationId).toBe("conv-1");
  });

  it("setLastVisitedChannel stores channel per workspace", () => {
    useChatStore.getState().setLastVisitedChannel("ws-1", "ch-1");
    expect(useChatStore.getState().lastVisitedChannels["ws-1"]).toBe("ch-1");

    useChatStore.getState().setLastVisitedChannel("ws-1", "ch-2");
    expect(useChatStore.getState().lastVisitedChannels["ws-1"]).toBe("ch-2");

    useChatStore.getState().setLastVisitedChannel("ws-2", "ch-3");
    expect(useChatStore.getState().lastVisitedChannels["ws-1"]).toBe("ch-2");
    expect(useChatStore.getState().lastVisitedChannels["ws-2"]).toBe("ch-3");
  });

  it("setDraft stores draft text per conversation", () => {
    useChatStore.getState().setDraft("conv-1", "Hello");
    expect(useChatStore.getState().drafts.get("conv-1")).toBe("Hello");
  });

  it("setDraft updates existing draft", () => {
    useChatStore.getState().setDraft("conv-1", "Hello");
    useChatStore.getState().setDraft("conv-1", "World");
    expect(useChatStore.getState().drafts.get("conv-1")).toBe("World");
  });

  it("clearDraft removes draft for a conversation", () => {
    useChatStore.getState().setDraft("conv-1", "Hello");
    useChatStore.getState().clearDraft("conv-1");
    expect(useChatStore.getState().drafts.has("conv-1")).toBe(false);
  });

  it("clearDraft does not affect other drafts", () => {
    useChatStore.getState().setDraft("conv-1", "Hello");
    useChatStore.getState().setDraft("conv-2", "World");
    useChatStore.getState().clearDraft("conv-1");
    expect(useChatStore.getState().drafts.get("conv-2")).toBe("World");
  });

  it("setHeaderInfo stores header info", () => {
    const info = { title: "General", isChannel: true, totalUnreadCount: 0, memberPanelOpen: false };
    useChatStore.getState().setHeaderInfo(info);
    expect(useChatStore.getState().headerInfo?.title).toBe("General");
  });

  it("setMemberPanelOpen updates headerInfo when present", () => {
    const info = { title: "General", isChannel: true, totalUnreadCount: 0, memberPanelOpen: false };
    useChatStore.getState().setHeaderInfo(info);
    useChatStore.getState().setMemberPanelOpen(true);
    expect(useChatStore.getState().headerInfo?.memberPanelOpen).toBe(true);
  });

  it("setMemberPanelOpen does nothing when headerInfo is null", () => {
    useChatStore.getState().setMemberPanelOpen(true);
    expect(useChatStore.getState().headerInfo).toBeNull();
  });

  it("clearAll resets state to initial values", () => {
    useChatStore.getState().setMode("WORKSPACE");
    useChatStore.getState().setActiveWorkspaceId("ws-1");
    useChatStore.getState().setActiveConversationId("conv-1");
    useChatStore.getState().setLastVisitedChannel("ws-1", "ch-1");
    useChatStore.getState().setDraft("conv-1", "Hello");
    useChatStore.getState().setHeaderInfo({ title: "General", isChannel: true, totalUnreadCount: 0, memberPanelOpen: false });
    useChatStore.getState().clearAll();

    const state = useChatStore.getState();
    expect(state.mode).toBe("DM");
    expect(state.activeWorkspaceId).toBeNull();
    expect(state.activeConversationId).toBeNull();
    expect(state.lastVisitedChannels).toEqual({});
    expect(state.drafts.size).toBe(0);
    expect(state.headerInfo).toBeNull();
  });
});
