import type { QueryClient } from "@tanstack/react-query";
import type { Conversation } from "@/modules/conversations/types/conversation";
import type { WorkspaceMember } from "@/modules/workspaces/types/workspace";
import { getAuthUser } from "@/modules/auth/store/useAuthStore";
import { APP_ROUTES } from "@/config/url";
import { toast } from "sonner";

// Guard against duplicate REMOVED events (emitted to both workspace and user rooms)
let isRedirectingFromRemoval = false;

export const handleWorkspaceUpdate = (queryClient: QueryClient) => {
  return (payload: any) => {
    // Workspace metadata changes are infrequent; invalidation is fine
    queryClient.invalidateQueries({ queryKey: ["workspaces"] });
  };
};

export const handleChannelUpdate = (queryClient: QueryClient) => {
  return (payload: { action: "UPDATED" | "DELETED"; channel: any }) => {
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
  return (payload: { action: "ROLE_UPDATED" | "REMOVED"; member: any }) => {
    if (!payload?.member) return;

    const { userId, role } = payload.member;

    if (payload.action === "REMOVED") {
      // If the current user was removed, redirect to home
      const currentUser = getAuthUser();
      if (currentUser?.id === userId) {
        // Guard against duplicate events (workspace room + user room)
        if (isRedirectingFromRemoval) return;
        isRedirectingFromRemoval = true;

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
