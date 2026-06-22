import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStoreBase, getAuthActions, getAuthUser } from "@/modules/auth/store/useAuthStore";

function createMockUser(overrides = {}) {
  return {
    id: "user-1",
    email: "alice@example.com",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  useAuthStoreBase.getState().clearAuth();
  useAuthStoreBase.getState().setInitialized(false);
});

describe("useAuthStore", () => {
  it("has correct initial state", () => {
    const state = useAuthStoreBase.getState();
    expect(state.user).toBeNull();
    expect(state.isInitialized).toBe(false);
  });

  it("setUser stores the user", () => {
    const user = createMockUser();
    useAuthStoreBase.getState().setUser(user);
    expect(useAuthStoreBase.getState().user?.id).toBe("user-1");
  });

  it("setUser(null) clears the user", () => {
    useAuthStoreBase.getState().setUser(createMockUser());
    useAuthStoreBase.getState().setUser(null);
    expect(useAuthStoreBase.getState().user).toBeNull();
  });

  it("setInitialized updates initialization flag", () => {
    useAuthStoreBase.getState().setInitialized(true);
    expect(useAuthStoreBase.getState().isInitialized).toBe(true);
  });

  it("clearAuth clears user but leaves isInitialized", () => {
    useAuthStoreBase.getState().setUser(createMockUser());
    useAuthStoreBase.getState().setInitialized(true);
    useAuthStoreBase.getState().clearAuth();
    expect(useAuthStoreBase.getState().user).toBeNull();
    expect(useAuthStoreBase.getState().isInitialized).toBe(true);
  });
});

describe("getAuthUser", () => {
  it("returns the current user", () => {
    useAuthStoreBase.getState().setUser(createMockUser());
    expect(getAuthUser()?.id).toBe("user-1");
  });

  it("returns null when no user set", () => {
    expect(getAuthUser()).toBeNull();
  });
});

describe("getAuthActions", () => {
  it("returns action functions", () => {
    const actions = getAuthActions();
    expect(typeof actions.setUser).toBe("function");
    expect(typeof actions.setInitialized).toBe("function");
  });
});
