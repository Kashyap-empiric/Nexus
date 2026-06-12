import { create } from "zustand";

interface HeaderInfo {
  title: string;
  subtitle?: string;
  isChannel: boolean;
  workspaceId?: string | null;
  otherMember?: {
    userId: string;
    username: string;
    avatarUrl: string | null;
  } | null;
  totalUnreadCount: number;
  memberPanelOpen: boolean;
}

interface UiState {
  mode: "DM" | "WORKSPACE";
  activeWorkspaceId: string | null;
  activeConversationId: string | null;
  lastVisitedChannels: Record<string, string>;
  drafts: Map<string, string>;
  headerInfo: HeaderInfo | null;
  setMode: (mode: "DM" | "WORKSPACE") => void;
  setActiveWorkspaceId: (id: string | null) => void;
  setActiveConversationId: (id: string | null) => void;
  setLastVisitedChannel: (workspaceId: string, channelId: string) => void;
  setDraft: (conversationId: string, text: string) => void;
  clearDraft: (conversationId: string) => void;
  setHeaderInfo: (info: HeaderInfo | null) => void;
  setMemberPanelOpen: (open: boolean) => void;
  clearAll: () => void;
}

export const useChatStore = create<UiState>((set) => ({
  mode: "DM",
  activeWorkspaceId: null,
  activeConversationId: null,
  lastVisitedChannels: {},
  drafts: new Map(),
  headerInfo: null,

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
  setHeaderInfo: (info) => set({ headerInfo: info }),
  setMemberPanelOpen: (open) =>
    set((state) => ({
      headerInfo: state.headerInfo ? { ...state.headerInfo, memberPanelOpen: open } : null,
    })),
  clearAll: () =>
    set({
      mode: "DM",
      activeWorkspaceId: null,
      activeConversationId: null,
      lastVisitedChannels: {},
      drafts: new Map(),
      headerInfo: null,
    }),
}));

import { storeResetHandlers } from "@/shared/lib/store-reset";
storeResetHandlers.add(() => useChatStore.getState().clearAll());
