import { create } from "zustand";

type SocketStatus = "connecting" | "connected" | "disconnected";

interface UiState {
  socketStatus: SocketStatus;
  activeConversationId: string | null;
  drafts: Map<string, string>;
  onlineUsers: Set<string>;
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
  activeConversationId: null,
  drafts: new Map(),
  onlineUsers: new Set(),

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
      activeConversationId: null,
      drafts: new Map(),
      onlineUsers: new Set(),
    }),
}));
