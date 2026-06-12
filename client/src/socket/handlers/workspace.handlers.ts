import type { QueryClient } from "@tanstack/react-query";
import type { Conversation } from "@/modules/conversations/types/conversation";
import type { WorkspaceMember } from "@/modules/workspaces/types/workspace";

export const handleWorkspaceUpdate = (queryClient: QueryClient) => {
  return (payload: any) => {
    // Workspace metadata changes are infrequent; invalidation is fine
    queryClient.invalidateQueries({ queryKey: ["workspaces"] });
  };
};

/**
 * Handle channel:update events with targeted cache updates.
 * - UPDATED: update channel name/visibility in cached workspace channels
 * - DELETED: remove channel from cached workspace channels
 */
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

/**
 * Handle member:update events with targeted cache updates.
 * - ROLE_UPDATED: update member's role in cached workspace members
 */
export const handleMemberUpdate = (queryClient: QueryClient) => {
  return (payload: { action: "ROLE_UPDATED"; member: any }) => {
    if (!payload?.member) return;

    const { userId, role } = payload.member;

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
