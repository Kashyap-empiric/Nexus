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
  lastVisitedChannels: Record<string, string>;
  drafts: Map<string, string>;
  scrollPositions: Record<string, number>;
  headerInfo: HeaderInfo | null;
  setLastVisitedChannel: (workspaceId: string, channelId: string) => void;
  setDraft: (conversationId: string, text: string) => void;
  clearDraft: (conversationId: string) => void;
  setScrollPosition: (conversationId: string, scrollTop: number) => void;
  clearScrollPosition: (conversationId: string) => void;
  setHeaderInfo: (info: HeaderInfo | null) => void;
  setMemberPanelOpen: (open: boolean) => void;
  clearAll: () => void;
}

export const useChatStore = create<UiState>((set) => ({
  lastVisitedChannels: {},
  drafts: new Map(),
  scrollPositions: {},
  headerInfo: null,

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
  setScrollPosition: (conversationId, scrollTop) =>
    set((state) => ({
      scrollPositions: {
        ...state.scrollPositions,
        [conversationId]: scrollTop
      }
    })),
  clearScrollPosition: (conversationId) =>
    set((state) => {
      const rest = { ...state.scrollPositions };
      delete rest[conversationId];
      return { scrollPositions: rest };
    }),
  setHeaderInfo: (info) => set({ headerInfo: info }),
  setMemberPanelOpen: (open) =>
    set((state) => ({
      headerInfo: state.headerInfo ? { ...state.headerInfo, memberPanelOpen: open } : null,
    })),
  clearAll: () =>
    set({
      lastVisitedChannels: {},
      drafts: new Map(),
      scrollPositions: {},
      headerInfo: null,
    }),
}));

import { storeResetHandlers } from "@/shared/lib/store-reset";
storeResetHandlers.add(() => useChatStore.getState().clearAll());
