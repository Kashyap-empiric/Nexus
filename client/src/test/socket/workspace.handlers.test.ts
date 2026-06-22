import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  handleWorkspaceUpdate,
  handleChannelUpdate,
  handleMemberUpdate,
  handleChannelMemberAdded,
  handleChannelMemberRemoved,
} from "../../socket/handlers/workspace.handlers";
import type { Conversation } from "@/modules/conversations/types/conversation";

vi.mock("@/modules/auth/store/useAuthStore", () => ({
  getAuthUser: vi.fn(() => ({ id: "user-1" })),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function createConv(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: "ch-1",
    type: "CHANNEL",
    isPrivate: false,
    name: "general",
    description: null,
    dmPair: null,
    workspaceId: "ws-1",
    members: [],
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    unreadCount: 0,
    ...overrides,
  };
}

describe("handleWorkspaceUpdate", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes workspace queries and shows toast on DELETE action", () => {
    queryClient.setQueryData(["workspaces"], [{ id: "ws-1" }]);
    queryClient.setQueryData(["workspace-members"], []);
    queryClient.setQueryData(["workspace-channels"], []);

    const handler = handleWorkspaceUpdate(queryClient);
    handler({ action: "DELETED", workspace: { id: "ws-1", name: "My Workspace" } });

    expect(queryClient.getQueryData(["workspaces"])).toBeUndefined();
    expect(queryClient.getQueryData(["workspace-members"])).toBeUndefined();
    expect(queryClient.getQueryData(["workspace-channels"])).toBeUndefined();
  });

  it("invalidates workspaces for non-delete actions", () => {
    queryClient.setQueryData(["workspaces"], [{ id: "ws-1" }]);

    const handler = handleWorkspaceUpdate(queryClient);
    handler({});

    const state = queryClient.getQueryState(["workspaces"]);
    expect(state?.isInvalidated).toBe(true);
  });
});

describe("handleChannelUpdate", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
  });

  it("updates channel name and visibility on UPDATED action", () => {
    const channels = [createConv({ id: "ch-1", name: "general", visibility: "PUBLIC", isPrivate: false })];
    queryClient.setQueryData(["workspace-channels", "ws-1"], channels);

    const handler = handleChannelUpdate(queryClient);
    handler({ action: "UPDATED", channel: { id: "ch-1", name: "random", visibility: "PRIVATE" } });

    const updated = queryClient.getQueryData<Conversation[]>(["workspace-channels", "ws-1"]);
    expect(updated![0].name).toBe("random");
    expect(updated![0].visibility).toBe("PRIVATE");
    expect(updated![0].isPrivate).toBe(true);
  });

  it("removes channel from cache on DELETED action", () => {
    const channels = [createConv({ id: "ch-1" }), createConv({ id: "ch-2" })];
    queryClient.setQueryData(["workspace-channels", "ws-1"], channels);

    const handler = handleChannelUpdate(queryClient);
    handler({ action: "DELETED", channel: { id: "ch-1" } });

    const updated = queryClient.getQueryData<Conversation[]>(["workspace-channels", "ws-1"]);
    expect(updated).toHaveLength(1);
    expect(updated![0].id).toBe("ch-2");
  });
});

describe("handleMemberUpdate", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("filters out removed member from workspace-members cache", () => {
    const members = [
      { workspaceId: "ws-1", userId: "user-2", role: "MEMBER" as const, joinedAt: "" },
      { workspaceId: "ws-1", userId: "user-3", role: "MEMBER" as const, joinedAt: "" },
    ];
    queryClient.setQueryData(["workspace-members", "ws-1"], members);

    const handler = handleMemberUpdate(queryClient);
    handler({ action: "REMOVED", member: { userId: "user-2" } });

    const updated = queryClient.getQueryData<{ userId: string }[]>(["workspace-members", "ws-1"]);
    expect(updated).toHaveLength(1);
    expect(updated![0].userId).toBe("user-3");
  });

  it("updates role for a member on ROLE_UPDATED action", () => {
    const members = [
      { workspaceId: "ws-1", userId: "user-2", role: "MEMBER" as const, joinedAt: "" },
    ];
    queryClient.setQueryData(["workspace-members", "ws-1"], members);

    const handler = handleMemberUpdate(queryClient);
    handler({ action: "ROLE_UPDATED", member: { userId: "user-2", role: "ADMIN" } });

    const updated = queryClient.getQueryData<{ role: string }[]>(["workspace-members", "ws-1"]);
    expect(updated![0].role).toBe("ADMIN");
  });
});

describe("handleChannelMemberAdded", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
  });

  it("invalidates channel members query", () => {
    queryClient.setQueryData(["workspaces", "ws-1", "channels", "ch-1", "members"], []);

    const handler = handleChannelMemberAdded(queryClient);
    handler({ workspaceId: "ws-1", channelId: "ch-1", addedMembers: [{ id: "user-2", username: "bob", fullName: null, avatarUrl: null }] });

    const state = queryClient.getQueryState(["workspaces", "ws-1", "channels", "ch-1", "members"]);
    expect(state?.isInvalidated).toBe(true);
  });

  it("invalidates workspace-channels when current user is added", () => {
    queryClient.setQueryData(["workspace-channels", "ws-1"], []);

    const handler = handleChannelMemberAdded(queryClient);
    handler({ workspaceId: "ws-1", channelId: "ch-1", addedMembers: [{ id: "user-1", username: "alice", fullName: null, avatarUrl: null }] });

    const state = queryClient.getQueryState(["workspace-channels", "ws-1"]);
    expect(state?.isInvalidated).toBe(true);
  });
});

describe("handleChannelMemberRemoved", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
  });

  it("invalidates channel members query", () => {
    queryClient.setQueryData(["workspaces", "ws-1", "channels", "ch-1", "members"], []);

    const handler = handleChannelMemberRemoved(queryClient);
    handler({ workspaceId: "ws-1", channelId: "ch-1", removedUserId: "user-2" });

    const state = queryClient.getQueryState(["workspaces", "ws-1", "channels", "ch-1", "members"]);
    expect(state?.isInvalidated).toBe(true);
  });

  it("removes channel from workspace-channels when current user is removed", () => {
    const channels = [createConv({ id: "ch-1", workspaceId: "ws-1" }), createConv({ id: "ch-2", workspaceId: "ws-1" })];
    queryClient.setQueryData(["workspace-channels", "ws-1"], channels);

    const handler = handleChannelMemberRemoved(queryClient);
    handler({ workspaceId: "ws-1", channelId: "ch-1", removedUserId: "user-1" });

    const updated = queryClient.getQueryData<Conversation[]>(["workspace-channels", "ws-1"]);
    expect(updated).toHaveLength(1);
    expect(updated![0].id).toBe("ch-2");
  });
});
