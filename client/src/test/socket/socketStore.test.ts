import { describe, it, expect, beforeEach } from "vitest";
import { useSocketStore } from "../../socket/socketStore";

beforeEach(() => {
  useSocketStore.getState().clearAll();
});

describe("socketStore", () => {
  it("has correct initial state", () => {
    const state = useSocketStore.getState();
    expect(state.socketStatus).toBe("disconnected");
    expect(state.onlineUsers.size).toBe(0);
    expect(state.typingUsers.size).toBe(0);
  });

  it("addUserOnline adds a user to the online set", () => {
    useSocketStore.getState().addUserOnline("user-1");
    expect(useSocketStore.getState().onlineUsers.has("user-1")).toBe(true);
  });

  it("removeUserOffline removes a user from the online set", () => {
    useSocketStore.getState().addUserOnline("user-1");
    useSocketStore.getState().removeUserOffline("user-1");
    expect(useSocketStore.getState().onlineUsers.has("user-1")).toBe(false);
  });

  it("addTypingUser adds a typing user to a conversation", () => {
    useSocketStore.getState().addTypingUser("conv-1", "user-1", "Alice");
    const convTyping = useSocketStore.getState().typingUsers.get("conv-1");
    expect(convTyping).toBeDefined();
    expect(convTyping!.get("user-1")?.username).toBe("Alice");
  });

  it("removeTypingUser removes a typing user from a conversation", () => {
    useSocketStore.getState().addTypingUser("conv-1", "user-1", "Alice");
    useSocketStore.getState().removeTypingUser("conv-1", "user-1");
    const convTyping = useSocketStore.getState().typingUsers.get("conv-1");
    expect(convTyping).toBeUndefined();
  });

  it("clearAll resets state to initial values", () => {
    useSocketStore.getState().addUserOnline("user-1");
    useSocketStore.getState().addTypingUser("conv-1", "user-1", "Alice");
    useSocketStore.getState().clearAll();

    const state = useSocketStore.getState();
    expect(state.socketStatus).toBe("disconnected");
    expect(state.onlineUsers.size).toBe(0);
    expect(state.typingUsers.size).toBe(0);
  });
});
