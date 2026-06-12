import { create } from "zustand";

type SocketStatus = "connecting" | "connected" | "disconnected";

interface UiState {
  socketStatus: SocketStatus;
  mode: "DM" | "WORKSPACE";
  activeWorkspaceId: string | null;
  activeConversationId: string | null;
  drafts: Map<string, string>;
  onlineUsers: Set<string>;
  setMode: (mode: "DM" | "WORKSPACE") => void;
  setActiveWorkspaceId: (id: string | null) => void;
  setSocketStatus: (status: SocketStatus) => void;
  setActiveConversationId: (id: string | null) => void;
  setDraft: (conversationId: string, text: string) => void;
  clearDraft: (conversationId: string) => void;
  setInitialOnlineUsers: (users: string[]) => void;
  addUserOnline: (userId: string) => void;
  removeUserOffline: (userId: string) => void;
  clearAll: () => void;
}

export const useChatStore = create<UiState>((set) => ({
  socketStatus: "disconnected",
  mode: "DM",
  activeWorkspaceId: null,
  activeConversationId: null,
  drafts: new Map(),
  onlineUsers: new Set(),

  setMode: (mode) => set({ mode }),
  setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
  setSocketStatus: (status) => set({ socketStatus: status }),
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  setDraft: (conversationId, text) =>
    set((state) => {
      const newDrafts = new Map(state.drafts);
      newDrafts.set(conversationId, text);
      return { drafts: newDrafts };
    }),
  clearDraft: (conversationId) =>
    set((state) => {
      const newDrafts = new Map(state.drafts);
      newDrafts.delete(conversationId);
      return { drafts: newDrafts };
    }),
  setInitialOnlineUsers: (users) =>
    set({ onlineUsers: new Set(users) }),
  addUserOnline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUsers);
      next.add(userId);
      return { onlineUsers: next };
    }),
  removeUserOffline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUsers);
      next.delete(userId);
      return { onlineUsers: next };
    }),
  clearAll: () =>
    set({
      socketStatus: "disconnected",
      mode: "DM",
      activeWorkspaceId: null,
      activeConversationId: null,
      drafts: new Map(),
      onlineUsers: new Set(),
    }),
}));

import { storeResetHandlers } from "@/shared/lib/store-reset";
storeResetHandlers.add(() => useChatStore.getState().clearAll());

