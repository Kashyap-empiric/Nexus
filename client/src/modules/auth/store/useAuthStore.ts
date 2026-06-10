import { create } from "zustand";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { storeResetHandlers } from "@/shared/lib/store-reset";

interface AuthState {
  user: SupabaseUser | null;
  isInitialized: boolean;

  setUser: (user: SupabaseUser | null) => void;
  setInitialized: (val: boolean) => void;
  clearAuth: () => void;
}

const useAuthStoreBase = create<AuthState>((set) => ({
  user: null,
  isInitialized: false,

  setUser: (user) => set({ user }),
  setInitialized: (val) => set({ isInitialized: val }),
  clearAuth: () => set({ user: null }),
}));

storeResetHandlers.add(() => useAuthStoreBase.getState().clearAuth());

export const useUser = () => useAuthStoreBase((state) => state.user);
export const useIsAuthenticated = () => useAuthStoreBase((state) => !!state.user);
export const useAuthInitialized = () => useAuthStoreBase((state) => state.isInitialized);
export const getAuthActions = () => ({
  setUser: useAuthStoreBase.getState().setUser,
  setInitialized: useAuthStoreBase.getState().setInitialized,
});
