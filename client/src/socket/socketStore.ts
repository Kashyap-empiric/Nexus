import { create } from "zustand";
import { storeResetHandlers } from "@/shared/lib/store-reset";

type SocketStatus = "connecting" | "connected" | "disconnected";

interface SocketState {
  socketStatus: SocketStatus;
  onlineUsers: Set<string>;
  setSocketStatus: (status: SocketStatus) => void;
  setInitialOnlineUsers: (users: string[]) => void;
  addUserOnline: (userId: string) => void;
  removeUserOffline: (userId: string) => void;
  clearAll: () => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  socketStatus: "disconnected",
  onlineUsers: new Set(),

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

  clearAll: () =>
    set({
      socketStatus: "disconnected",
      onlineUsers: new Set(),
    }),
}));

storeResetHandlers.add(() => useSocketStore.getState().clearAll());
