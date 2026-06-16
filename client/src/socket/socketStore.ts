import { create } from "zustand";
import { storeResetHandlers } from "@/shared/lib/store-reset";

type SocketStatus = "connecting" | "connected" | "disconnected";

export interface TypingUser {
  userId: string;
  username: string;
  timestamp: number;
}

interface SocketState {
  socketStatus: SocketStatus;
  onlineUsers: Set<string>;
  /** Map of conversationId -> Map of userId -> TypingUser */
  typingUsers: Map<string, Map<string, TypingUser>>;
  setSocketStatus: (status: SocketStatus) => void;
  setInitialOnlineUsers: (users: string[]) => void;
  addUserOnline: (userId: string) => void;
  removeUserOffline: (userId: string) => void;
  addTypingUser: (conversationId: string, userId: string, username: string) => void;
  removeTypingUser: (conversationId: string, userId: string) => void;
  clearTypingForConversation: (conversationId: string) => void;
  clearAll: () => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  socketStatus: "disconnected",
  onlineUsers: new Set(),
  typingUsers: new Map(),

  setSocketStatus: (status) => set({ socketStatus: status }),

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

  addTypingUser: (conversationId, userId, username) =>
    set((state) => {
      const next = new Map(state.typingUsers);
      const conversationTyping = new Map(next.get(conversationId));
      conversationTyping.set(userId, { userId, username, timestamp: Date.now() });
      next.set(conversationId, conversationTyping);
      return { typingUsers: next };
    }),

  removeTypingUser: (conversationId, userId) =>
    set((state) => {
      const next = new Map(state.typingUsers);
      const conversationTyping = next.get(conversationId);
      if (!conversationTyping) return state;
      const updated = new Map(conversationTyping);
      updated.delete(userId);
      if (updated.size === 0) {
        next.delete(conversationId);
      } else {
        next.set(conversationId, updated);
      }
      return { typingUsers: next };
    }),

  clearTypingForConversation: (conversationId) =>
    set((state) => {
      const next = new Map(state.typingUsers);
      next.delete(conversationId);
      return { typingUsers: next };
    }),

  clearAll: () =>
    set({
      socketStatus: "disconnected",
      onlineUsers: new Set(),
      typingUsers: new Map(),
    }),
}));

storeResetHandlers.add(() => useSocketStore.getState().clearAll());
