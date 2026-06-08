import { create } from "zustand";

type SocketStatus = "connecting" | "connected" | "disconnected";

interface UiState {
  socketStatus: SocketStatus;
  activeConversationId: string | null;
  drafts: Map<string, string>;
  setSocketStatus: (status: SocketStatus) => void;
  setActiveConversationId: (id: string | null) => void;
  setDraft: (conversationId: string, text: string) => void;
  clearDraft: (conversationId: string) => void;
  clearAll: () => void;
}

export const useChatStore = create<UiState>((set) => ({
  socketStatus: "disconnected",
  activeConversationId: null,
  drafts: new Map(),

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
  clearAll: () =>
    set({
      socketStatus: "disconnected",
      activeConversationId: null,
      drafts: new Map(),
    }),
}));
