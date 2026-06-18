import type { QueryClient } from "@tanstack/react-query";
import type { Conversation } from "@/modules/conversations/types/conversation";
import type { WorkspaceMember } from "@/modules/workspaces/types/workspace";
import { getAuthUser } from "@/modules/auth/store/useAuthStore";
import { APP_ROUTES } from "@/config/url";
import type { ChannelUpdatePayload, MemberUpdatePayload, ChannelMemberAddedPayload, ChannelMemberRemovedPayload } from "@/socket/socket-events";
import { toast } from "sonner";

// Guard against duplicate REMOVED events (emitted to both workspace and user rooms)
let isRedirectingFromRemoval = false;

export const handleWorkspaceUpdate = (queryClient: QueryClient) => {
  return (payload?: { action?: string; workspace?: { id?: string; name?: string } }) => {
    if (payload?.action === "DELETED") {
      // Workspace was deleted — redirect to conversations
      queryClient.removeQueries({ queryKey: ["workspaces"] });
      queryClient.removeQueries({ queryKey: ["workspace-members"] });
      queryClient.removeQueries({ queryKey: ["workspace-channels"] });

      toast.error(`"${payload.workspace?.name || "Workspace"}" was deleted`, {
        duration: 5000,
      });

      // Redirect to conversations after a short delay
      setTimeout(() => {
        window.location.href = APP_ROUTES.CONVERSATIONS.INDEX;
      }, 1500);
      return;
    }

    // Workspace metadata changes are infrequent; invalidation is fine
    queryClient.invalidateQueries({ queryKey: ["workspaces"] });
  };
};

export const handleChannelUpdate = (queryClient: QueryClient) => {
  return (payload: ChannelUpdatePayload) => {
    if (!payload?.channel?.id) return;

    const { id, name, visibility } = payload.channel;

    // Update workspace channels cache with targeted changes
    const queries = queryClient.getQueriesData<Conversation[]>({ queryKey: ["workspace-channels"] });
    queries.forEach(([queryKey, oldData]) => {
      if (!Array.isArray(oldData)) return;

      if (payload.action === "UPDATED") {
        queryClient.setQueryData(queryKey, oldData.map((channel) => {
          if (channel.id !== id) return channel;
          return {
            ...channel,
            ...(name !== undefined && { name }),
            ...(visibility !== undefined && { visibility, isPrivate: visibility === "PRIVATE" }),
          };
        }));
      } else if (payload.action === "DELETED") {
        queryClient.setQueryData(queryKey, oldData.filter((channel) => channel.id !== id));
      }
    });
  };
};

export const handleMemberUpdate = (queryClient: QueryClient) => {
  return (payload: MemberUpdatePayload) => {
    if (!payload?.member) return;

    const { userId, role } = payload.member;

    if (payload.action === "REMOVED") {
      // If the current user was removed, redirect to home
      const currentUser = getAuthUser();
      if (currentUser?.id === userId) {
        // Guard against duplicate events (workspace room + user room)
        if (isRedirectingFromRemoval) return;
        isRedirectingFromRemoval = true;

        // Reset the guard after 10 seconds in case the redirect doesn't complete
        // (e.g., component unmounts or navigation is interrupted)
        setTimeout(() => {
          isRedirectingFromRemoval = false;
        }, 10_000);

        toast.error("You have been removed from the workspace");
        setTimeout(() => {
          window.location.href = APP_ROUTES.CONVERSATIONS.INDEX;
        }, 1500);
        return;
      }

      // Remove member from cached member lists
      const queries = queryClient.getQueriesData<WorkspaceMember[]>({ queryKey: ["workspace-members"] });
      queries.forEach(([queryKey, oldData]) => {
        if (!Array.isArray(oldData)) return;
        queryClient.setQueryData(queryKey, oldData.filter((member) => member.userId !== userId));
      });

      // Invalidate workspaces cache
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      return;
    }

    // Update workspace members cache with targeted role change
    const queries = queryClient.getQueriesData<WorkspaceMember[]>({ queryKey: ["workspace-members"] });
    queries.forEach(([queryKey, oldData]) => {
      if (!Array.isArray(oldData)) return;

      queryClient.setQueryData(queryKey, oldData.map((member) => {
        if (member.userId !== userId) return member;
        return { ...member, role };
      }));
    });

    // Also invalidate workspaces since roles are embedded in workspace details
    queryClient.invalidateQueries({ queryKey: ["workspaces"] });
  };
};

export const handleChannelMemberAdded = (queryClient: QueryClient) => {
  return (payload: ChannelMemberAddedPayload) => {
    if (!payload?.workspaceId || !payload?.channelId) return;
    queryClient.invalidateQueries({
      queryKey: ["workspaces", payload.workspaceId, "channels", payload.channelId, "members"],
    });
  };
};

export const handleChannelMemberRemoved = (queryClient: QueryClient) => {
  return (payload: ChannelMemberRemovedPayload) => {
    if (!payload?.workspaceId || !payload?.channelId || !payload?.removedUserId) return;

    queryClient.invalidateQueries({
      queryKey: ["workspaces", payload.workspaceId, "channels", payload.channelId, "members"],
    });

    const currentUser = getAuthUser();
    if (currentUser?.id === payload.removedUserId) {
      toast.error("You have been removed from the channel");
      setTimeout(() => {
        window.location.href = APP_ROUTES.CONVERSATIONS.INDEX;
      }, 1500);
    }
  };
};
