import { create } from "zustand";

interface UiState {
  mode: "DM" | "WORKSPACE";
  activeWorkspaceId: string | null;
  activeConversationId: string | null;
  lastVisitedChannels: Record<string, string>;
  drafts: Map<string, string>;
  setMode: (mode: "DM" | "WORKSPACE") => void;
  setActiveWorkspaceId: (id: string | null) => void;
  setActiveConversationId: (id: string | null) => void;
  setLastVisitedChannel: (workspaceId: string, channelId: string) => void;
  setDraft: (conversationId: string, text: string) => void;
  clearDraft: (conversationId: string) => void;
  clearAll: () => void;
}

export const useChatStore = create<UiState>((set) => ({
  mode: "DM",
  activeWorkspaceId: null,
  activeConversationId: null,
  lastVisitedChannels: {},
  drafts: new Map(),

  setMode: (mode) => set({ mode }),
  setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  setLastVisitedChannel: (workspaceId, channelId) => 
    set((state) => ({
      lastVisitedChannels: {
        ...state.lastVisitedChannels,
        [workspaceId]: channelId
      }
    })),
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
      mode: "DM",
      activeWorkspaceId: null,
      activeConversationId: null,
      lastVisitedChannels: {},
      drafts: new Map(),
    }),
}));

import { storeResetHandlers } from "@/shared/lib/store-reset";
storeResetHandlers.add(() => useChatStore.getState().clearAll());
